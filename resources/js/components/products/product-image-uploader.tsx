import {
    Camera,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ImagePlus,
    Pencil,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import InputError from '@/components/input-error';
import { PhotoCropModal } from '@/components/products/product-photo-modals';
import type { PendingPhoto } from '@/components/products/product-photo-modals';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProductImage } from '@/types';

const MAX_IMAGES = 5;
const EXISTING_IMAGE_PREFIX = 'existing:';
const NEW_IMAGE_PREFIX = 'new:';

type ProductImageUploaderProps = {
    value: File[];
    existingImages?: ProductImage[];
    error?: string;
    onChange: (files: File[], imageOrder: string[]) => void;
    onRemoveExisting: (id: number) => void;
    onProcessingChange?: (processing: boolean) => void;
};

type NewImageItem = {
    id: string;
    file: File;
    sourceFile: File;
    previewUrl: string;
};

type ExistingGalleryItem = {
    key: string;
    kind: 'existing';
    image: ProductImage;
};

type NewGalleryItem = {
    key: string;
    kind: 'new';
    image: NewImageItem;
};

type GalleryItem = ExistingGalleryItem | NewGalleryItem;

export function ProductImageUploader({
    value,
    existingImages = [],
    error,
    onChange,
    onRemoveExisting,
    onProcessingChange,
}: ProductImageUploaderProps) {
    const objectUrls = useRef<Set<string>>(new Set());
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [items, setItems] = useState<NewImageItem[]>(() =>
        value.map((file) => ({
            id: crypto.randomUUID(),
            file,
            sourceFile: file,
            previewUrl: '',
        })),
    );
    const [galleryOrder, setGalleryOrder] = useState<string[]>(() =>
        existingImages.map((image) => existingImageKey(image.id)),
    );
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);

    useEffect(() => {
        if (!items.some((item) => item.previewUrl === '')) {
            return;
        }

        setItems((currentItems) =>
            currentItems.map((item) =>
                item.previewUrl
                    ? item
                    : {
                          ...item,
                          previewUrl: createObjectUrl(
                              item.file,
                              objectUrls.current,
                          ),
                      },
            ),
        );
    }, [items]);

    useEffect(() => {
        onProcessingChange?.(processing);
    }, [onProcessingChange, processing]);

    useEffect(() => {
        const urls = objectUrls.current;

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    const availableKeys = [
        ...existingImages.map((image) => existingImageKey(image.id)),
        ...items.map((item) => newImageKey(item.id)),
    ];
    const currentGalleryOrder = reconcileGalleryOrder(
        galleryOrder,
        availableKeys,
    );
    const galleryItems = getGalleryItems(
        currentGalleryOrder,
        existingImages,
        items,
    );
    const imageCount = galleryItems.length;
    const hasRoom = imageCount < MAX_IMAGES;
    const selectedIndex = selectedKey
        ? galleryItems.findIndex((item) => item.key === selectedKey)
        : -1;
    const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const selectedGalleryItem = galleryItems[activeIndex] ?? null;
    const primaryPreviewUrl = selectedGalleryItem
        ? getGalleryImageUrl(selectedGalleryItem)
        : null;

    const createPreviewUrl = (file: File): string =>
        createObjectUrl(file, objectUrls.current);

    const revokeObjectUrl = (url: string) => {
        URL.revokeObjectURL(url);
        objectUrls.current.delete(url);
    };

    const notifyChange = (nextOrder: string[], nextItems: NewImageItem[]) => {
        const { files, imageOrder } = serializeGallery(
            nextOrder,
            existingImages,
            nextItems,
        );

        onChange(files, imageOrder);
    };

    const closePendingPhoto = () => {
        if (pendingPhoto) {
            revokeObjectUrl(pendingPhoto.url);
        }

        setPendingPhoto(null);
        setEditingItemId(null);
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        event.target.value = '';

        if (!file || !hasRoom || processing) {
            return;
        }

        if (pendingPhoto) {
            revokeObjectUrl(pendingPhoto.url);
        }

        setClientError(null);
        setPendingPhoto({ file, url: createPreviewUrl(file) });
    };

    const handleApplyPhoto = async (croppedFile: File) => {
        setProcessing(true);

        const previewUrl = createPreviewUrl(croppedFile);
        const editingItem = editingItemId
            ? items.find((item) => item.id === editingItemId)
            : null;

        if (editingItem) {
            revokeObjectUrl(editingItem.previewUrl);
        }

        const nextItems = editingItem
            ? items.map((item) =>
                  item.id === editingItem.id
                      ? { ...item, file: croppedFile, previewUrl }
                      : item,
              )
            : [
                  ...items,
                  {
                      id: crypto.randomUUID(),
                      file: croppedFile,
                      sourceFile: pendingPhoto?.file ?? croppedFile,
                      previewUrl,
                  },
              ];
        const nextOrder = editingItem
            ? currentGalleryOrder
            : [
                  ...currentGalleryOrder,
                  newImageKey(nextItems[nextItems.length - 1].id),
              ];

        setItems(nextItems);
        setGalleryOrder(nextOrder);
        setSelectedKey(
            editingItem
                ? newImageKey(editingItem.id)
                : newImageKey(nextItems[nextItems.length - 1].id),
        );
        notifyChange(nextOrder, nextItems);
        closePendingPhoto();
        setProcessing(false);
    };

    const handleEditNewImage = (item: NewImageItem) => {
        if (processing) {
            return;
        }

        if (pendingPhoto) {
            revokeObjectUrl(pendingPhoto.url);
        }

        setSelectedKey(newImageKey(item.id));
        setEditingItemId(item.id);
        setClientError(null);
        setPendingPhoto({
            file: item.sourceFile,
            url: createPreviewUrl(item.sourceFile),
        });
    };

    const moveGalleryItem = (offset: -1 | 1) => {
        if (!selectedGalleryItem) {
            return;
        }

        const targetIndex = activeIndex + offset;

        if (targetIndex < 0 || targetIndex >= currentGalleryOrder.length) {
            return;
        }

        const nextOrder = [...currentGalleryOrder];
        [nextOrder[activeIndex], nextOrder[targetIndex]] = [
            nextOrder[targetIndex],
            nextOrder[activeIndex],
        ];
        setGalleryOrder(nextOrder);
        notifyChange(nextOrder, items);
    };

    const makeSelectedImagePrincipal = () => {
        if (!selectedGalleryItem || activeIndex === 0) {
            return;
        }

        const nextOrder = [
            selectedGalleryItem.key,
            ...currentGalleryOrder.filter(
                (key) => key !== selectedGalleryItem.key,
            ),
        ];
        setGalleryOrder(nextOrder);
        setSelectedKey(selectedGalleryItem.key);
        notifyChange(nextOrder, items);
    };

    const removeSelectedImage = () => {
        if (!selectedGalleryItem) {
            return;
        }

        const imageName = getGalleryImageName(selectedGalleryItem);

        if (
            !window.confirm(
                `Remover ${activeIndex === 0 ? 'a foto principal' : 'esta foto'}${imageName ? ` (${imageName})` : ''}?`,
            )
        ) {
            return;
        }

        const nextOrder = currentGalleryOrder.filter(
            (key) => key !== selectedGalleryItem.key,
        );
        const nextSelectedKey =
            nextOrder[Math.min(activeIndex, nextOrder.length - 1)] ?? null;

        setGalleryOrder(nextOrder);
        setSelectedKey(nextSelectedKey);

        if (selectedGalleryItem.kind === 'existing') {
            onRemoveExisting(selectedGalleryItem.image.id);
            notifyChange(nextOrder, items);

            return;
        }

        revokeObjectUrl(selectedGalleryItem.image.previewUrl);
        const nextItems = items.filter(
            (item) => item.id !== selectedGalleryItem.image.id,
        );
        setItems(nextItems);
        notifyChange(nextOrder, nextItems);
    };

    const openCamera = () => cameraInputRef.current?.click();
    const openFilePicker = () => fileInputRef.current?.click();

    return (
        <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-dashed border-border bg-muted">
                    {primaryPreviewUrl ? (
                        <>
                            <img
                                src={primaryPreviewUrl}
                                alt="Pré-visualização da foto do produto"
                                className="size-full object-cover"
                                decoding="async"
                            />
                            {activeIndex === 0 && (
                                <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-foreground uppercase shadow-sm">
                                    Foto principal
                                </span>
                            )}
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={openFilePicker}
                            className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-accent"
                        >
                            <span className="flex size-14 items-center justify-center rounded-full bg-background text-primary shadow-sm">
                                <ImagePlus className="size-6" />
                            </span>
                            <span className="text-sm font-medium text-foreground">
                                Adicione fotos da peça
                            </span>
                            <span className="max-w-52 text-xs leading-5 text-muted-foreground">
                                Uma foto por vez · JPG, PNG ou WebP · até 5 MB
                            </span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
                    {galleryItems.map((item, index) => (
                        <div
                            key={item.key}
                            className={cn(
                                'relative overflow-hidden rounded-xl border bg-muted transition',
                                activeIndex === index
                                    ? 'border-primary ring-2 ring-primary/30'
                                    : 'border-border hover:border-primary/60',
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => setSelectedKey(item.key)}
                                className="block aspect-square w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                aria-current={index === 0 ? 'true' : undefined}
                                aria-label={
                                    index === 0
                                        ? 'Selecionar foto principal'
                                        : 'Selecionar foto ' + (index + 1)
                                }
                            >
                                <img
                                    src={getGalleryImageUrl(item, true)}
                                    alt=""
                                    className="size-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
                            {index === 0 && (
                                <span className="pointer-events-none absolute right-1 bottom-1 left-1 rounded-md bg-background/90 px-1 py-0.5 text-center text-[9px] font-semibold text-foreground shadow-sm">
                                    Principal
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {selectedGalleryItem && (
                <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="grid gap-1">
                            <p className="text-sm font-semibold text-foreground">
                                Foto {activeIndex + 1} de {imageCount}
                            </p>
                            <p className="text-xs leading-5 text-muted-foreground">
                                {activeIndex === 0
                                    ? 'Esta é a foto usada como principal no catálogo.'
                                    : 'Escolha uma ação para ajustar a posição desta foto.'}
                            </p>
                        </div>
                        {activeIndex === 0 && (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                                Principal
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {activeIndex > 0 && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={makeSelectedImagePrincipal}
                                disabled={processing}
                            >
                                <ChevronsLeft />
                                Tornar principal
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => moveGalleryItem(-1)}
                            disabled={processing || activeIndex === 0}
                        >
                            <ChevronLeft />
                            Mover antes
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => moveGalleryItem(1)}
                            disabled={
                                processing || activeIndex === imageCount - 1
                            }
                        >
                            Mover depois
                            <ChevronRight />
                        </Button>
                        {selectedGalleryItem.kind === 'new' && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    handleEditNewImage(
                                        selectedGalleryItem.image,
                                    )
                                }
                                disabled={processing}
                            >
                                <Pencil />
                                Editar foto
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={removeSelectedImage}
                            disabled={processing}
                        >
                            <Trash2 />
                            Remover foto
                        </Button>
                    </div>
                </div>
            )}

            <input
                ref={cameraInputRef}
                id="product-images-camera"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={handleFileChange}
                disabled={!hasRoom || processing}
            />
            <input
                ref={fileInputRef}
                id="product-images-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
                disabled={!hasRoom || processing}
            />

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={openCamera}
                    disabled={!hasRoom || processing}
                >
                    <Camera />
                    Tirar foto
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openFilePicker}
                    disabled={!hasRoom || processing}
                >
                    <ImagePlus />
                    Escolher arquivo
                </Button>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                    {imageCount} de {MAX_IMAGES}{' '}
                    {imageCount === 1 ? 'foto' : 'fotos'}
                </span>
                <span>
                    {processing
                        ? 'Processando foto...'
                        : hasRoom
                          ? 'Você pode adicionar outra foto.'
                          : 'Limite de fotos atingido.'}
                </span>
            </div>

            <InputError message={clientError ?? error} />

            {pendingPhoto && (
                <PhotoCropModal
                    key={pendingPhoto.url}
                    pendingPhoto={pendingPhoto}
                    onCancel={closePendingPhoto}
                    onApply={handleApplyPhoto}
                    onRetake={openCamera}
                    onError={() =>
                        setClientError(
                            'Não foi possível preparar a foto. Tente usar uma imagem JPG, PNG ou WebP.',
                        )
                    }
                />
            )}
        </div>
    );
}

function createObjectUrl(file: File, urls: Set<string>): string {
    const url = URL.createObjectURL(file);
    urls.add(url);

    return url;
}

function existingImageKey(id: number): string {
    return EXISTING_IMAGE_PREFIX + id;
}

function newImageKey(id: string): string {
    return NEW_IMAGE_PREFIX + id;
}

function getGalleryItems(
    order: string[],
    existingImages: ProductImage[],
    items: NewImageItem[],
): GalleryItem[] {
    const existingByKey = new Map(
        existingImages.map((image) => [existingImageKey(image.id), image]),
    );
    const newItemsByKey = new Map(
        items.map((item) => [newImageKey(item.id), item]),
    );

    return order.flatMap((key): GalleryItem[] => {
        const existingImage = existingByKey.get(key);

        if (existingImage) {
            return [{ key, kind: 'existing' as const, image: existingImage }];
        }

        const newImage = newItemsByKey.get(key);

        return newImage ? [{ key, kind: 'new' as const, image: newImage }] : [];
    });
}

function getGalleryImageUrl(item: GalleryItem, thumbnail = false): string {
    if (item.kind === 'new') {
        return item.image.previewUrl;
    }

    return thumbnail
        ? (item.image.thumb_url ?? item.image.url)
        : item.image.url;
}

function getGalleryImageName(item: GalleryItem): string {
    return item.kind === 'existing' ? item.image.name : item.image.file.name;
}

function serializeGallery(
    order: string[],
    existingImages: ProductImage[],
    items: NewImageItem[],
): { files: File[]; imageOrder: string[] } {
    const galleryItems = getGalleryItems(order, existingImages, items);
    const newItems = galleryItems
        .filter((item): item is NewGalleryItem => item.kind === 'new')
        .map((item) => item.image);
    const newIndexByKey = new Map(
        galleryItems
            .filter((item): item is NewGalleryItem => item.kind === 'new')
            .map((item, index) => [item.key, index]),
    );

    return {
        files: newItems.map((item) => item.file),
        imageOrder: galleryItems.map((item) =>
            item.kind === 'existing'
                ? 'media:' + item.image.id
                : 'new:' + newIndexByKey.get(item.key),
        ),
    };
}

function reconcileGalleryOrder(
    currentOrder: string[],
    availableKeys: string[],
): string[] {
    const availableKeySet = new Set(availableKeys);
    const retainedKeys = currentOrder.filter((key) => availableKeySet.has(key));
    const retainedKeySet = new Set(retainedKeys);

    return [
        ...retainedKeys,
        ...availableKeys.filter((key) => !retainedKeySet.has(key)),
    ];
}
