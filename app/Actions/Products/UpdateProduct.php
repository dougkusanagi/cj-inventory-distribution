<?php

namespace App\Actions\Products;

use App\Actions\Stock\StockMovementRecorder;
use App\Actions\Stock\StockMutation;
use App\Enums\StockMovementSource;
use App\Enums\StockMovementType;
use App\Enums\StockOfferType;
use App\Models\Product;
use App\Models\StockOfferVolume;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

class UpdateProduct
{
    public function __construct(
        private readonly StoreProductImage $storeProductImage,
        private readonly SyncProductStock $syncProductStock,
        private readonly StockMovementRecorder $stockMovementRecorder,
    ) {}

    /**
     * Update a product and its stock atomically.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(Product $product, array $data): Product
    {
        return $this->persist($product, $data, function (Product $lockedProduct) use ($data): void {
            $lockedProduct->update([
                'name' => $data['name'],
                'model' => $data['model'] ?? null,
                'category_id' => $data['category_id'] ?? null,
                'wash_type_id' => array_key_exists('wash_type_id', $data) ? $data['wash_type_id'] : $lockedProduct->wash_type_id,
                'line' => $data['line'] ?? null,
                'notes' => $data['notes'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ]);

            $this->changeStockType($lockedProduct, $data['stock_offer_type'] ?? null);
            $this->syncProductStock->handle($lockedProduct, $data);
        });
    }

    /**
     * Change the product's stock type and record it in the stock history.
     *
     * Orders and movements keep the type in their own snapshots. Grade Nova
     * never enters orders, so sacks reserved by pending orders block it.
     */
    private function changeStockType(Product $product, ?string $value): void
    {
        $type = $value === null ? null : StockOfferType::from($value);

        if ($type === null || $type === $product->stock_offer_type) {
            return;
        }

        $volumes = $product->stockVolumes()
            ->whereNull('consumed_at')
            ->with('items')
            ->lockForUpdate()
            ->get();

        if ($type === StockOfferType::NewGrade && $volumes->contains(fn (StockOfferVolume $volume): bool => $volume->current_order_id !== null)) {
            throw ValidationException::withMessages([
                'stock_offer_type' => 'Há sacos reservados em pedidos. Finalize ou cancele os pedidos antes de mudar para Grade Nova.',
            ]);
        }

        $previousType = $product->stock_offer_type;
        $product->loadMissing('category');
        $volumes->each(fn (StockOfferVolume $volume) => $volume->setRelation('product', $product));
        $previousStates = $volumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
            $volume->getKey() => $this->stockMovementRecorder->snapshot($volume),
        ])->all();

        $product->update(['stock_offer_type' => $type]);

        if ($volumes->isEmpty()) {
            return;
        }

        $this->stockMovementRecorder->handle(
            StockMovementType::Adjustment,
            StockMovementSource::Reclassification,
            $volumes,
            Auth::user(),
            reason: "Tipo de grade alterado de {$previousType->label()} para {$type->label()}",
            previousStates: $previousStates,
            resultingStates: $volumes->mapWithKeys(fn (StockOfferVolume $volume): array => [
                $volume->getKey() => $this->stockMovementRecorder->snapshot($volume),
            ])->all(),
        );
    }

    /**
     * Add, remove and reorder product photos without touching other product data.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateImages(Product $product, array $data): Product
    {
        return $this->persist($product, $data);
    }

    /**
     * Lock the product, apply optional attribute changes and sync its photos atomically.
     *
     * @param  array<string, mixed>  $data
     * @param  (callable(Product): void)|null  $updateAttributes
     */
    private function persist(Product $product, array $data, ?callable $updateAttributes = null): Product
    {
        $addedMedia = [];
        $mediaBackups = [];
        $images = [];
        foreach ($data['images'] ?? [] as $index => $image) {
            if ($image instanceof UploadedFile) {
                $images[$index] = $this->storeProductImage->prepare($image);
            }
        }

        try {
            $persist = function () use ($product, $data, $images, $updateAttributes, &$addedMedia, &$mediaBackups): Product {
                $lockedProduct = Product::query()
                    ->whereKey($product->getKey())
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($updateAttributes !== null) {
                    $updateAttributes($lockedProduct);
                }

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

                if ($remainingMediaCount + count($images) > Product::MAX_IMAGES) {
                    throw ValidationException::withMessages(['images' => 'Um produto pode ter no máximo 5 fotos.']);
                }

                $addedMedia = $this->storeImages(
                    $lockedProduct,
                    $images,
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
            };
            $updatedProduct = $updateAttributes === null
                ? DB::transaction($persist, 5)
                : StockMutation::run($persist);
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
            'stockVolumes.items',
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
                if (is_string($image)) {
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
