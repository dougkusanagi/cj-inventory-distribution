import {
    Camera,
    Crop,
    FlipHorizontal2,
    ImagePlus,
    RotateCcw,
    RotateCw,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProductImage } from '@/types';

const MAX_IMAGES = 5;
const MAX_IMAGE_DIMENSION = 1600;
const MAX_UPLOAD_BYTES = 1024 * 1024;
const INITIAL_JPEG_QUALITY = 0.82;
const MIN_JPEG_QUALITY = 0.5;
const IMAGE_PROCESSING_ERROR =
    'Não foi possível preparar uma das imagens. Tente usar uma foto JPG, PNG ou WebP.';

type ProductImageUploaderProps = {
    value: File[];
    existingImages?: ProductImage[];
    error?: string;
    onChange: (files: File[]) => void;
    onRemoveExisting: (id: number) => void;
    onProcessingChange?: (processing: boolean) => void;
};

type ImageTransform = {
    rotation: number;
    mirrored: boolean;
    cropped: boolean;
};

type NewImageItem = {
    id: string;
    file: File;
    sourceFile: File;
    sourceUrl: string;
    transform: ImageTransform;
};

const emptyTransform = (): ImageTransform => ({
    rotation: 0,
    mirrored: false,
    cropped: false,
});

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = sourceUrl;
    });
}

function renderImage(
    image: HTMLImageElement,
    transform: ImageTransform,
    scale: number,
    quality: number,
): Promise<Blob> {
    const cropWidth = transform.cropped
        ? Math.min(image.naturalWidth, image.naturalHeight)
        : image.naturalWidth;
    const cropHeight = transform.cropped
        ? Math.min(image.naturalWidth, image.naturalHeight)
        : image.naturalHeight;
    const canvas = document.createElement('canvas');
    const isSideways = transform.rotation === 90 || transform.rotation === 270;
    const scaledWidth = Math.max(1, Math.round(cropWidth * scale));
    const scaledHeight = Math.max(1, Math.round(cropHeight * scale));

    canvas.width = isSideways ? scaledHeight : scaledWidth;
    canvas.height = isSideways ? scaledWidth : scaledHeight;

    const context = canvas.getContext('2d');

    if (!context) {
        return Promise.reject(new Error('Não foi possível criar o canvas.'));
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((transform.rotation * Math.PI) / 180);
    context.scale(transform.mirrored ? -1 : 1, 1);
    context.drawImage(
        image,
        (transform.cropped
            ? (cropWidth - image.naturalWidth) / 2
            : -image.naturalWidth / 2) * scale,
        (transform.cropped
            ? (cropHeight - image.naturalHeight) / 2
            : -image.naturalHeight / 2) * scale,
        image.naturalWidth * scale,
        image.naturalHeight * scale,
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Não foi possível exportar a imagem.'));
                }
            },
            'image/jpeg',
            quality,
        );
    });
}

async function transformImage(
    sourceUrl: string,
    transform: ImageTransform,
): Promise<File> {
    const image = await loadImage(sourceUrl);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);

    if (longestSide === 0) {
        throw new Error('A imagem não possui dimensões válidas.');
    }

    let scale = Math.min(1, MAX_IMAGE_DIMENSION / longestSide);
    let quality = INITIAL_JPEG_QUALITY;

    for (let attempt = 0; attempt < 20; attempt += 1) {
        const blob = await renderImage(image, transform, scale, quality);

        if (blob.size <= MAX_UPLOAD_BYTES) {
            return new File([blob], 'product-photo.jpg', {
                type: 'image/jpeg',
            });
        }

        if (quality > MIN_JPEG_QUALITY) {
            quality = Math.max(MIN_JPEG_QUALITY, quality - 0.1);
        } else {
            scale *= 0.8;
            quality = INITIAL_JPEG_QUALITY;
        }
    }

    throw new Error('A imagem não pôde ser reduzida ao tamanho permitido.');
}

function createNewImageItem(file: File): NewImageItem {
    return {
        id: crypto.randomUUID(),
        file,
        sourceFile: file,
        sourceUrl: URL.createObjectURL(file),
        transform: emptyTransform(),
    };
}

async function prepareNewImageItem(
    file: File,
    objectUrls: Set<string>,
): Promise<NewImageItem> {
    const sourceUrl = URL.createObjectURL(file);
    objectUrls.add(sourceUrl);

    try {
        const uploadFile = await transformImage(sourceUrl, emptyTransform());

        return {
            id: crypto.randomUUID(),
            file: uploadFile,
            sourceFile: file,
            sourceUrl,
            transform: emptyTransform(),
        };
    } catch (error) {
        URL.revokeObjectURL(sourceUrl);
        objectUrls.delete(sourceUrl);

        throw error;
    }
}

export function ProductImageUploader({
    value,
    existingImages = [],
    error,
    onChange,
    onRemoveExisting,
    onProcessingChange,
}: ProductImageUploaderProps) {
    const [items, setItems] = useState<NewImageItem[]>(() =>
        value.map(createNewImageItem),
    );
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [clientError, setClientError] = useState<string | null>(null);
    const objectUrls = useRef<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        items.forEach((item) => objectUrls.current.add(item.sourceUrl));
    }, [items]);

    useEffect(() => {
        const urls = objectUrls.current;

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    useEffect(() => {
        onProcessingChange?.(processing);
    }, [onProcessingChange, processing]);

    const selectedItem = items[selectedIndex] ?? null;
    const imageCount = existingImages.length + items.length;
    const hasRoom = imageCount < MAX_IMAGES;

    const updateItems = (nextItems: NewImageItem[]) => {
        setItems(nextItems);
        onChange(nextItems.map((item) => item.file));

        if (nextItems.length === 0) {
            setSelectedIndex(0);
        } else if (selectedIndex >= nextItems.length) {
            setSelectedIndex(nextItems.length - 1);
        }
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        const nextFiles = files.slice(0, MAX_IMAGES - imageCount);

        event.target.value = '';

        if (nextFiles.length === 0) {
            return;
        }

        setClientError(null);
        setProcessing(true);

        const preparedItems: NewImageItem[] = [];
        let hasProcessingError = false;

        for (const file of nextFiles) {
            try {
                preparedItems.push(
                    await prepareNewImageItem(file, objectUrls.current),
                );
            } catch {
                hasProcessingError = true;
                break;
            }
        }

        if (preparedItems.length > 0) {
            const nextItems = [...items, ...preparedItems];

            setItems(nextItems);
            onChange(nextItems.map((item) => item.file));
            setSelectedIndex(items.length);
        }

        if (hasProcessingError) {
            setClientError(IMAGE_PROCESSING_ERROR);
        }

        setProcessing(false);
    };

    const handleRemoveNewImage = (index: number) => {
        const item = items[index];

        if (item) {
            URL.revokeObjectURL(item.sourceUrl);
            objectUrls.current.delete(item.sourceUrl);
        }

        updateItems(items.filter((_, itemIndex) => itemIndex !== index));
    };

    const applyTransform = async (
        item: NewImageItem,
        nextTransform: ImageTransform,
    ) => {
        setClientError(null);
        setProcessing(true);

        try {
            const nextFile = await transformImage(
                item.sourceUrl,
                nextTransform,
            );
            const nextItems = items.map((currentItem) =>
                currentItem.id === item.id
                    ? {
                          ...currentItem,
                          file: nextFile,
                          transform: nextTransform,
                      }
                    : currentItem,
            );

            updateItems(nextItems);
        } catch {
            setClientError(IMAGE_PROCESSING_ERROR);
        } finally {
            setProcessing(false);
        }
    };

    const handleRotate = (direction: 'left' | 'right') => {
        if (!selectedItem) {
            return;
        }

        const rotation =
            (selectedItem.transform.rotation +
                (direction === 'right' ? 90 : 270)) %
            360;

        void applyTransform(selectedItem, {
            ...selectedItem.transform,
            rotation,
        });
    };

    const handleMirror = () => {
        if (!selectedItem) {
            return;
        }

        void applyTransform(selectedItem, {
            ...selectedItem.transform,
            mirrored: !selectedItem.transform.mirrored,
        });
    };

    const handleCrop = () => {
        if (!selectedItem || selectedItem.transform.cropped) {
            return;
        }

        void applyTransform(selectedItem, {
            ...selectedItem.transform,
            cropped: true,
        });
    };

    const handleReset = () => {
        if (!selectedItem) {
            return;
        }

        void applyTransform(selectedItem, emptyTransform());
    };

    const primaryPreviewUrl =
        selectedItem?.sourceUrl ?? existingImages[0]?.url ?? null;
    const primaryTransform = selectedItem?.transform;

    return (
        <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-dashed border-border bg-muted">
                    {primaryPreviewUrl ? (
                        <img
                            src={primaryPreviewUrl}
                            alt="Pré-visualização da foto do produto"
                            className="size-full object-cover transition-transform duration-300"
                            style={
                                primaryTransform
                                    ? {
                                          transform:
                                              'rotate(' +
                                              primaryTransform.rotation +
                                              'deg) scaleX(' +
                                              (primaryTransform.mirrored
                                                  ? -1
                                                  : 1) +
                                              ')',
                                      }
                                    : undefined
                            }
                            decoding="async"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-accent"
                        >
                            <span className="flex size-14 items-center justify-center rounded-full bg-background text-highlight shadow-sm">
                                <ImagePlus className="size-6" />
                            </span>
                            <span className="text-sm font-medium text-foreground">
                                Adicione fotos da peça
                            </span>
                            <span className="max-w-48 text-xs leading-5 text-muted-foreground">
                                JPG, PNG ou WebP · até 5 MB por foto
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
                                    src={item.sourceUrl}
                                    alt=""
                                    className="size-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
                            <button
                                type="button"
                                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                onClick={() => handleRemoveNewImage(index)}
                                aria-label={
                                    'Remover nova imagem ' + (index + 1)
                                }
                            >
                                <Trash2 className="size-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <input
                ref={inputRef}
                id="product-images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                disabled={!hasRoom || processing}
            />

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={!hasRoom || processing}
                >
                    <Camera />
                    {imageCount > 0 ? 'Adicionar imagens' : 'Escolher imagens'}
                </Button>

                {selectedItem && (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleRotate('left')}
                            disabled={processing}
                            aria-label="Girar para a esquerda"
                        >
                            <RotateCcw />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleRotate('right')}
                            disabled={processing}
                            aria-label="Girar para a direita"
                        >
                            <RotateCw />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleMirror}
                            disabled={processing}
                            aria-label="Espelhar foto"
                        >
                            <FlipHorizontal2 />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCrop}
                            disabled={
                                processing || selectedItem.transform.cropped
                            }
                        >
                            <Crop />
                            Cortar
                        </Button>
                        {(selectedItem.transform.rotation !== 0 ||
                            selectedItem.transform.mirrored ||
                            selectedItem.transform.cropped) && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                disabled={processing}
                            >
                                Desfazer edição
                            </Button>
                        )}
                    </>
                )}
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                    {imageCount} de {MAX_IMAGES} imagens
                </span>
                <span>
                    {processing
                        ? 'Preparando fotos...'
                        : hasRoom
                          ? 'Você pode adicionar mais fotos.'
                          : 'Limite de fotos atingido.'}
                </span>
            </div>

            <InputError message={clientError ?? error} />
        </div>
    );
}
