import { Camera, ImagePlus, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import InputError from '@/components/input-error';
import { PhotoCropModal } from '@/components/products/product-photo-modals';
import type { PendingPhoto } from '@/components/products/product-photo-modals';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProductImage } from '@/types';

const MAX_IMAGES = 5;

type ProductImageUploaderProps = {
    value: File[];
    existingImages?: ProductImage[];
    error?: string;
    onChange: (files: File[]) => void;
    onRemoveExisting: (id: number) => void;
    onProcessingChange?: (processing: boolean) => void;
};

type NewImageItem = {
    id: string;
    file: File;
    sourceFile: File;
    previewUrl: string;
};

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
    const [selectedIndex, setSelectedIndex] = useState(0);
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

    const imageCount = existingImages.length + items.length;
    const hasRoom = imageCount < MAX_IMAGES;
    const selectedItem = items[selectedIndex] ?? null;
    const primaryPreviewUrl =
        selectedItem?.previewUrl ?? existingImages[0]?.url ?? null;

    const createPreviewUrl = (file: File): string =>
        createObjectUrl(file, objectUrls.current);

    const revokeObjectUrl = (url: string) => {
        URL.revokeObjectURL(url);
        objectUrls.current.delete(url);
    };

    const updateItems = (
        nextItems: NewImageItem[],
        nextSelectedIndex?: number,
    ) => {
        setItems(nextItems);
        onChange(nextItems.map((item) => item.file));

        if (nextItems.length === 0) {
            setSelectedIndex(0);

            return;
        }

        setSelectedIndex(
            Math.min(nextSelectedIndex ?? selectedIndex, nextItems.length - 1),
        );
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

        updateItems(
            nextItems,
            editingItem
                ? items.findIndex((item) => item.id === editingItem.id)
                : nextItems.length - 1,
        );
        closePendingPhoto();
        setProcessing(false);
    };

    const handleEditNewImage = (index: number) => {
        const item = items[index];

        if (!item || processing) {
            return;
        }

        if (pendingPhoto) {
            revokeObjectUrl(pendingPhoto.url);
        }

        setSelectedIndex(index);
        setEditingItemId(item.id);
        setClientError(null);
        setPendingPhoto({
            file: item.sourceFile,
            url: createPreviewUrl(item.sourceFile),
        });
    };

    const handleRemoveNewImage = (index: number) => {
        const item = items[index];

        if (!item) {
            return;
        }

        revokeObjectUrl(item.previewUrl);
        updateItems(items.filter((_, itemIndex) => itemIndex !== index));
    };

    const openCamera = () => cameraInputRef.current?.click();
    const openFilePicker = () => fileInputRef.current?.click();

    return (
        <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-dashed border-border bg-muted">
                    {primaryPreviewUrl ? (
                        <img
                            src={primaryPreviewUrl}
                            alt="Pré-visualização da foto do produto"
                            className="size-full object-cover"
                            decoding="async"
                        />
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

                <div className="grid grid-cols-5 gap-2 sm:grid-cols-1">
                    {existingImages.map((image) => (
                        <div
                            key={image.id}
                            className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                        >
                            <img
                                src={image.thumb_url ?? image.url}
                                alt=""
                                className="size-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                            <button
                                type="button"
                                onClick={() => onRemoveExisting(image.id)}
                                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                aria-label={'Remover imagem ' + image.name}
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    ))}

                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className={cn(
                                'relative aspect-square overflow-hidden rounded-xl border bg-muted transition',
                                selectedIndex === index
                                    ? 'border-primary ring-2 ring-primary/30'
                                    : 'border-border hover:border-primary/60',
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => setSelectedIndex(index)}
                                className="size-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                aria-label={
                                    'Selecionar nova imagem ' + (index + 1)
                                }
                            >
                                <img
                                    src={item.previewUrl}
                                    alt=""
                                    className="size-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
                            <div className="absolute top-1 right-1 flex gap-1">
                                <button
                                    type="button"
                                    className="flex size-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    onClick={() => handleEditNewImage(index)}
                                    aria-label={
                                        'Editar nova imagem ' + (index + 1)
                                    }
                                    disabled={processing}
                                >
                                    <Pencil className="size-3.5" />
                                </button>
                                <button
                                    type="button"
                                    className="flex size-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    onClick={() => handleRemoveNewImage(index)}
                                    aria-label={
                                        'Remover nova imagem ' + (index + 1)
                                    }
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

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
