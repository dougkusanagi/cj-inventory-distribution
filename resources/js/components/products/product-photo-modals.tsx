import {
    FlipHorizontal2,
    FlipVertical2,
    RotateCcw,
    RotateCw,
    Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, MediaSize, Point, Size } from 'react-easy-crop';
import { Button } from '@/components/ui/button';

export type PendingPhoto = {
    file: File;
    url: string;
};

export type FlipState = {
    horizontal: boolean;
    vertical: boolean;
};

const getRadianAngle = (degree: number): number => (degree * Math.PI) / 180;

const rotatedCanvasSize = (
    width: number,
    height: number,
    rotation: number,
): { width: number; height: number } => {
    const rotationInRadians = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(rotationInRadians) * width) +
            Math.abs(Math.sin(rotationInRadians) * height),
        height:
            Math.abs(Math.sin(rotationInRadians) * width) +
            Math.abs(Math.cos(rotationInRadians) * height),
    };
};

const getMinimumCropZoom = (
    mediaSize: MediaSize | null,
    cropSize: Size | null,
    rotation: number,
): number => {
    if (
        !mediaSize ||
        !cropSize ||
        mediaSize.width <= 0 ||
        mediaSize.height <= 0
    ) {
        return 1;
    }

    const rotatedMediaSize = rotatedCanvasSize(
        mediaSize.width,
        mediaSize.height,
        rotation,
    );

    return Math.max(
        1,
        cropSize.width / rotatedMediaSize.width,
        cropSize.height / rotatedMediaSize.height,
    );
};

export const createCroppedPhoto = (
    imageSource: string,
    pixelCrop: Area,
    rotation: number,
    flip: FlipState,
): Promise<File> =>
    new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            const rotatedSize = rotatedCanvasSize(
                image.naturalWidth,
                image.naturalHeight,
                rotation,
            );
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(rotatedSize.width);
            canvas.height = Math.round(rotatedSize.height);
            const context = canvas.getContext('2d');

            if (!context) {
                reject(new Error('Não foi possível preparar a imagem.'));

                return;
            }

            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate(getRadianAngle(rotation));
            context.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
            context.translate(
                -image.naturalWidth / 2,
                -image.naturalHeight / 2,
            );
            context.drawImage(image, 0, 0);

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = Math.round(pixelCrop.width);
            croppedCanvas.height = Math.round(pixelCrop.height);
            const croppedContext = croppedCanvas.getContext('2d');

            if (!croppedContext) {
                reject(new Error('Não foi possível recortar a imagem.'));

                return;
            }

            croppedContext.drawImage(
                canvas,
                Math.round(pixelCrop.x),
                Math.round(pixelCrop.y),
                croppedCanvas.width,
                croppedCanvas.height,
                0,
                0,
                croppedCanvas.width,
                croppedCanvas.height,
            );
            croppedCanvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error('Não foi possível exportar a imagem.'),
                        );

                        return;
                    }

                    resolve(
                        new File([blob], 'produto.jpg', {
                            type: 'image/jpeg',
                        }),
                    );
                },
                'image/jpeg',
                0.9,
            );
        };
        image.onerror = () =>
            reject(new Error('Não foi possível carregar a imagem.'));
        image.src = imageSource;
    });

export function PhotoCropModal({
    pendingPhoto,
    onCancel,
    onApply,
    onRetake,
    onError,
}: {
    pendingPhoto: PendingPhoto;
    onCancel: () => void;
    onApply: (croppedFile: File) => Promise<void>;
    onRetake: () => void;
    onError?: (error: Error) => void;
}) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [cropZoom, setCropZoom] = useState(1);
    const [cropRotation, setCropRotation] = useState(0);
    const [cropMediaSize, setCropMediaSize] = useState<MediaSize | null>(null);
    const [cropContainerSize, setCropContainerSize] = useState<Size | null>(
        null,
    );
    const [cropSize, setCropSize] = useState<Size | null>(null);
    const [cropFlip, setCropFlip] = useState<FlipState>({
        horizontal: false,
        vertical: false,
    });
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
        null,
    );
    const [isApplyingCrop, setIsApplyingCrop] = useState(false);

    const cropContainerRef = useRef<HTMLDivElement | null>(null);
    const cropMediaSizeRef = useRef<MediaSize | null>(null);
    const cropSizeRef = useRef<Size | null>(null);

    const minimumCropZoom = useMemo(
        () => getMinimumCropZoom(cropMediaSize, cropSize, cropRotation),
        [cropMediaSize, cropRotation, cropSize],
    );

    useEffect(() => {
        const container = cropContainerRef.current;

        if (!container) {
            return;
        }

        const updateContainerSize = () => {
            setCropContainerSize({
                width: container.clientWidth,
                height: container.clientHeight,
            });
        };

        updateContainerSize();
        const resizeObserver = new ResizeObserver(updateContainerSize);
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, []);

    const handleCropMediaLoaded = (mediaSize: MediaSize) => {
        cropMediaSizeRef.current = mediaSize;
        setCropMediaSize(mediaSize);
        setCropZoom((currentZoom) =>
            Math.max(
                currentZoom,
                getMinimumCropZoom(
                    mediaSize,
                    cropSizeRef.current,
                    cropRotation,
                ),
            ),
        );
    };

    const handleCropSizeChange = (size: Size) => {
        cropSizeRef.current = size;
        setCropSize(size);
        setCropZoom((currentZoom) =>
            Math.max(
                currentZoom,
                getMinimumCropZoom(
                    cropMediaSizeRef.current,
                    size,
                    cropRotation,
                ),
            ),
        );
    };

    const rotateCrop = (degrees: number) => {
        const nextRotation = cropRotation + degrees;
        setCropRotation(nextRotation);
        setCropZoom((currentZoom) =>
            Math.max(
                currentZoom,
                getMinimumCropZoom(
                    cropMediaSizeRef.current,
                    cropSizeRef.current,
                    nextRotation,
                ),
            ),
        );
    };

    const resetCrop = () => {
        setCrop({ x: 0, y: 0 });
        setCropRotation(0);
        setCropZoom(
            getMinimumCropZoom(
                cropMediaSizeRef.current,
                cropSizeRef.current,
                0,
            ),
        );
        setCropFlip({ horizontal: false, vertical: false });
        setCroppedAreaPixels(null);
    };

    const applyCrop = async () => {
        if (!croppedAreaPixels) {
            return;
        }

        try {
            setIsApplyingCrop(true);
            const croppedFile = await createCroppedPhoto(
                pendingPhoto.url,
                croppedAreaPixels,
                cropRotation,
                cropFlip,
            );
            await onApply(croppedFile);
        } catch (error) {
            onError?.(
                error instanceof Error
                    ? error
                    : new Error('Não foi possível preparar a imagem.'),
            );
        } finally {
            setIsApplyingCrop(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-foreground/80 p-4 backdrop-blur-sm sm:items-center sm:p-5"
            role="presentation"
        >
            <div
                className="flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-card p-5 text-card-foreground shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-7"
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-photo-crop-title"
            >
                <div className="flex shrink-0 items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
                            Ajustar foto
                        </div>
                        <h2
                            id="product-photo-crop-title"
                            className="mt-1 text-2xl font-semibold tracking-tight"
                        >
                            Ajuste a imagem
                        </h2>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        disabled={isApplyingCrop}
                    >
                        Cancelar
                    </Button>
                </div>

                <div
                    ref={cropContainerRef}
                    className="relative mx-auto mt-5 aspect-square w-full max-w-sm shrink-0 overflow-hidden rounded-2xl bg-foreground"
                >
                    <Cropper
                        image={pendingPhoto.url}
                        crop={crop}
                        zoom={cropZoom}
                        rotation={cropRotation}
                        aspect={1}
                        cropSize={cropContainerSize ?? undefined}
                        minZoom={minimumCropZoom}
                        maxZoom={Number.POSITIVE_INFINITY}
                        objectFit="contain"
                        zoomWithScroll={false}
                        showGrid
                        roundCropAreaPixels
                        onCropChange={setCrop}
                        onCropComplete={(_, nextPixels) =>
                            setCroppedAreaPixels(nextPixels)
                        }
                        onZoomChange={setCropZoom}
                        onMediaLoaded={handleCropMediaLoaded}
                        onCropSizeChange={handleCropSizeChange}
                        transform={`translate(${crop.x}px, ${crop.y}px) rotate(${cropRotation}deg) scale(${cropZoom}) scaleX(${cropFlip.horizontal ? -1 : 1}) scaleY(${cropFlip.vertical ? -1 : 1})`}
                        classes={{
                            cropAreaClassName:
                                'rounded-2xl border-2 border-primary',
                        }}
                        cropperProps={{
                            'aria-label': 'Área de recorte da foto',
                        }}
                    />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pt-5">
                    <div className="grid gap-4">
                        <p className="text-center text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                            Use dois dedos para aproximar ou afastar
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => rotateCrop(-90)}
                                disabled={isApplyingCrop}
                                title="Girar para a esquerda"
                            >
                                <RotateCcw className="size-4" />
                                Esquerda
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => rotateCrop(90)}
                                disabled={isApplyingCrop}
                                title="Girar para a direita"
                            >
                                <RotateCw className="size-4" />
                                Direita
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setCropFlip((currentFlip) => ({
                                        ...currentFlip,
                                        horizontal: !currentFlip.horizontal,
                                    }))
                                }
                                disabled={isApplyingCrop}
                                title="Inverter horizontalmente"
                            >
                                <FlipHorizontal2 className="size-4" />
                                Horizontal
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setCropFlip((currentFlip) => ({
                                        ...currentFlip,
                                        vertical: !currentFlip.vertical,
                                    }))
                                }
                                disabled={isApplyingCrop}
                                title="Inverter verticalmente"
                            >
                                <FlipVertical2 className="size-4" />
                                Vertical
                            </Button>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={resetCrop}
                            disabled={isApplyingCrop}
                            className="w-full"
                        >
                            <Undo2 className="size-4" />
                            Restaurar
                        </Button>
                    </div>

                    <div className="mt-5 grid gap-2 pb-1 sm:grid-cols-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onRetake}
                            disabled={isApplyingCrop}
                        >
                            Tirar outra foto
                        </Button>
                        <Button
                            type="button"
                            variant="default"
                            onClick={applyCrop}
                            disabled={isApplyingCrop || !croppedAreaPixels}
                        >
                            {isApplyingCrop
                                ? 'Processando...'
                                : 'Cortar e salvar'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
