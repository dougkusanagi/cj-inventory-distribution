<?php

namespace App\Actions\Products;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

class UpdateProduct
{
    public function __construct(
        private readonly StoreProductImage $storeProductImage,
        private readonly SyncProductStockOffer $syncProductStockOffer,
    ) {}

    /**
     * Update a product and its stock offer atomically.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(Product $product, array $data): Product
    {
        $addedMedia = [];
        $mediaBackups = [];

        try {
            $updatedProduct = DB::transaction(function () use ($product, $data, &$addedMedia, &$mediaBackups): Product {
                $lockedProduct = Product::query()
                    ->whereKey($product->getKey())
                    ->lockForUpdate()
                    ->firstOrFail();

                $lockedProduct->update([
                    'name' => $data['name'],
                    'model' => ($data['model'] ?? null) ?: null,
                    'notes' => ($data['notes'] ?? null) ?: null,
                    'is_active' => $data['is_active'] ?? true,
                ]);

                $rawRemoveMediaIds = $data['remove_media_ids'] ?? [];
                $rawRemoveMediaIds = is_array($rawRemoveMediaIds) ? $rawRemoveMediaIds : [];
                $removeMediaIds = collect($rawRemoveMediaIds)
                    ->filter(fn ($id): bool => is_numeric($id))
                    ->map(fn ($id): int => (int) $id)
                    ->values();
                $mediaToRemove = $lockedProduct->media()
                    ->where('collection_name', Product::MEDIA_COLLECTION)
                    ->whereKey($removeMediaIds)
                    ->get();
                $removedMedia = $mediaToRemove->all();
                foreach ($removedMedia as $media) {
                    $mediaBackups = [
                        ...$mediaBackups,
                        ...$this->backupMediaFiles($media),
                    ];
                }
                $remainingMediaCount = $lockedProduct->media()
                    ->where('collection_name', Product::MEDIA_COLLECTION)
                    ->whereNotIn('id', $removeMediaIds)
                    ->count();

                $this->syncProductStockOffer->handle($lockedProduct, $data);
                $addedMedia = $this->storeImages(
                    $lockedProduct,
                    $data['images'] ?? [],
                    $remainingMediaCount,
                );
                $this->reorderImages(
                    $lockedProduct,
                    $data['image_order'] ?? null,
                    $addedMedia,
                    $removeMediaIds->all(),
                );

                Media::withoutEvents(function () use ($removedMedia): void {
                    foreach ($removedMedia as $media) {
                        $media->delete();
                    }
                });

                return $lockedProduct;
            });
        } catch (Throwable $exception) {
            foreach ($addedMedia as $media) {
                try {
                    $media->delete();
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }

            $this->restoreMediaFiles($mediaBackups);

            throw $exception;
        }

        foreach ($mediaBackups as $backup) {
            try {
                Storage::disk($backup['disk'])->delete($backup['backup']);
            } catch (Throwable $cleanupException) {
                report($cleanupException);
            }
        }

        return $updatedProduct->fresh()->load([
            'latestOffer.stockVolumes.items',
            'media',
        ]);
    }

    /**
     * Store validated images after the remaining media items.
     *
     * @return array<int, Media>
     */
    private function storeImages(
        Product $product,
        mixed $images,
        int $startingOrder,
    ): array {
        if (! is_array($images)) {
            return [];
        }

        $addedMedia = [];

        try {
            foreach ($images as $index => $image) {
                if ($image instanceof UploadedFile) {
                    $addedMedia[$index] = $this->storeProductImage->handle(
                        $product,
                        $image,
                        $startingOrder + $index,
                    );
                }
            }
        } catch (Throwable $exception) {
            foreach ($addedMedia as $media) {
                try {
                    $media->delete();
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }

            throw $exception;
        }

        return $addedMedia;
    }

    /**
     * Persist the order selected in the product form.
     *
     * @param  array<int, Media>  $addedMedia
     * @param  array<int, mixed>  $removeMediaIds
     */
    private function reorderImages(
        Product $product,
        mixed $imageOrder,
        array $addedMedia,
        array $removeMediaIds,
    ): void {
        $mediaIdsByUploadIndex = collect($addedMedia)
            ->mapWithKeys(fn (Media $media, int|string $index): array => [
                (int) $index => (int) $media->getKey(),
            ]);
        $ownedMediaIds = $product->media()
            ->where('collection_name', Product::MEDIA_COLLECTION)
            ->whereNotIn('id', $removeMediaIds)
            ->pluck('id')
            ->map(fn (mixed $id): int => (int) $id)
            ->all();

        if (! is_array($imageOrder)) {
            Media::setNewOrder($ownedMediaIds);

            return;
        }

        $orderedMediaIds = [];

        foreach ($imageOrder as $token) {
            if (! is_string($token)) {
                throw new RuntimeException('The product image order is invalid.');
            }

            if (str_starts_with($token, 'media:')) {
                $orderedMediaIds[] = (int) substr($token, strlen('media:'));

                continue;
            }

            if (str_starts_with($token, 'new:')) {
                $uploadIndex = (int) substr($token, strlen('new:'));

                if (! $mediaIdsByUploadIndex->has($uploadIndex)) {
                    throw new RuntimeException('The product image order references an unknown upload.');
                }

                $orderedMediaIds[] = $mediaIdsByUploadIndex->get($uploadIndex);

                continue;
            }

            throw new RuntimeException('The product image order contains an invalid token.');
        }

        $expectedMediaIds = $ownedMediaIds;
        sort($expectedMediaIds);
        $actualMediaIds = $orderedMediaIds;
        sort($actualMediaIds);

        if (
            $expectedMediaIds !== $actualMediaIds
            || count($orderedMediaIds) !== count($ownedMediaIds)
        ) {
            throw new RuntimeException('The product image order changed during the update.');
        }

        Media::setNewOrder($orderedMediaIds);
    }

    /**
     * Move all files belonging to a media item to a temporary backup.
     *
     * @return array<int, array{disk: string, original: string, backup: string}>
     */
    private function backupMediaFiles(Media $media): array
    {
        $files = [
            [
                'disk' => $media->disk,
                'path' => $media->getPathRelativeToRoot(),
            ],
        ];

        foreach ($media->getGeneratedConversions()->filter()->keys() as $conversion) {
            $files[] = [
                'disk' => $media->conversions_disk ?: $media->disk,
                'path' => $media->getPathRelativeToRoot($conversion),
            ];
        }

        $backups = [];

        try {
            foreach ($files as $file) {
                $disk = Storage::disk($file['disk']);

                if (! $disk->exists($file['path'])) {
                    continue;
                }

                $backupPath = 'product-media-cleanup/'.Str::uuid().'/'.basename($file['path']);

                if (! $disk->move($file['path'], $backupPath)) {
                    throw new RuntimeException('Não foi possível preparar a exclusão da imagem.');
                }

                $backups[] = [
                    'disk' => $file['disk'],
                    'original' => $file['path'],
                    'backup' => $backupPath,
                ];
            }
        } catch (Throwable $exception) {
            $this->restoreMediaFiles($backups);

            throw $exception;
        }

        return $backups;
    }

    /**
     * Restore files that were moved before a failed media deletion.
     *
     * @param  array<int, array{disk: string, original: string, backup: string}>  $backups
     */
    private function restoreMediaFiles(array $backups): void
    {
        foreach (array_reverse($backups) as $backup) {
            try {
                $disk = Storage::disk($backup['disk']);

                if ($disk->exists($backup['backup'])) {
                    $disk->move($backup['backup'], $backup['original']);
                }
            } catch (Throwable $restoreException) {
                report($restoreException);
            }
        }
    }
}
