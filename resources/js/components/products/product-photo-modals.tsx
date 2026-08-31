import {
    FlipHorizontal2,
    FlipVertical2,
    RotateCcw,
    RotateCw,
    Undo2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, MediaSize, Point, Size } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

export type PhotoEditorSource = {
    url: string;
    name: string;
    origin: 'camera' | 'gallery' | 'existing';
};

export type FlipState = {
    horizontal: boolean;
    vertical: boolean;
};

const PHOTO_ASPECT_RATIO = 4 / 5;
const MAX_OUTPUT_WIDTH = 1600;
const MAX_OUTPUT_HEIGHT = 2000;

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

function editedPhotoName(originalName: string): string {
    const baseName = originalName.replace(/\.[^.]+$/, '').trim() || 'produto';

    return `${baseName}-ajustada.jpg`;
}

export const createCroppedPhoto = (
    imageSource: string,
    originalName: string,
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

            const outputScale = Math.min(
                1,
                MAX_OUTPUT_WIDTH / pixelCrop.width,
                MAX_OUTPUT_HEIGHT / pixelCrop.height,
            );
            const outputWidth = Math.max(
                1,
                Math.round(pixelCrop.width * outputScale),
            );
            const outputHeight = Math.max(
                1,
                Math.round(pixelCrop.height * outputScale),
            );
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = outputWidth;
            croppedCanvas.height = outputHeight;
            const croppedContext = croppedCanvas.getContext('2d');

            if (!croppedContext) {
                reject(new Error('Não foi possível recortar a imagem.'));

                return;
            }

            croppedContext.drawImage(
                canvas,
                Math.round(pixelCrop.x),
                Math.round(pixelCrop.y),
                Math.round(pixelCrop.width),
                Math.round(pixelCrop.height),
                0,
                0,
                outputWidth,
                outputHeight,
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
                        new File([blob], editedPhotoName(originalName), {
                            type: 'image/jpeg',
                        }),
                    );
                },
                'image/jpeg',
                0.86,
            );
        };
        image.onerror = () =>
            reject(new Error('Não foi possível carregar a imagem.'));
        image.crossOrigin = 'anonymous';
        image.src = imageSource;
    });

type PhotoEditorProps = {
    source: PhotoEditorSource;
    onCancel: () => void;
    onApply: (editedFile: File) => Promise<void>;
    onRetake?: () => void;
};

export function PhotoEditor({
    source,
    onCancel,
    onApply,
    onRetake,
}: PhotoEditorProps) {
    const isMobile = useIsMobile();
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
    const [cropSize, setCropSize] = useState<Size | null>(null);
    const [flip, setFlip] = useState<FlipState>({
        horizontal: false,
        vertical: false,
    });
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
        null,
    );
    const [isApplying, setIsApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaSizeRef = useRef<MediaSize | null>(null);
    const cropSizeRef = useRef<Size | null>(null);

    const minimumZoom = useMemo(
        () => getMinimumCropZoom(mediaSize, cropSize, rotation),
        [cropSize, mediaSize, rotation],
    );
    const maximumZoom = Math.max(minimumZoom + 3, 4);

    const rotate = (degrees: number) => {
        const nextRotation = rotation + degrees;
        const nextMinimumZoom = getMinimumCropZoom(
            mediaSizeRef.current,
            cropSizeRef.current,
            nextRotation,
        );

        setRotation(nextRotation);
        setZoom((currentZoom) => Math.max(currentZoom, nextMinimumZoom));
    };

    const reset = () => {
        setCrop({ x: 0, y: 0 });
        setRotation(0);
        setFlip({ horizontal: false, vertical: false });
        setZoom(
            getMinimumCropZoom(mediaSizeRef.current, cropSizeRef.current, 0),
        );
        setError(null);
    };

    const apply = async () => {
        if (!croppedAreaPixels) {
            return;
        }

        try {
            setIsApplying(true);
            setError(null);
            const editedFile = await createCroppedPhoto(
                source.url,
                source.name,
                croppedAreaPixels,
                rotation,
                flip,
            );
            await onApply(editedFile);
        } catch {
            setError(
                'Não foi possível ajustar esta foto. Tente usar outra imagem.',
            );
        } finally {
            setIsApplying(false);
        }
    };

    const content = (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative mx-4 h-[min(46dvh,28rem)] min-h-64 shrink-0 overflow-hidden rounded-2xl bg-foreground sm:mx-0 sm:h-[min(60vh,32rem)]">
                <Cropper
                    image={source.url}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={PHOTO_ASPECT_RATIO}
                    minZoom={minimumZoom}
                    maxZoom={maximumZoom}
                    objectFit="contain"
                    zoomWithScroll={false}
                    showGrid
                    roundCropAreaPixels
                    onCropChange={setCrop}
                    onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                    onZoomChange={setZoom}
                    onMediaLoaded={(nextMediaSize) => {
                        mediaSizeRef.current = nextMediaSize;
                        setMediaSize(nextMediaSize);
                        setZoom((currentZoom) =>
                            Math.max(
                                currentZoom,
                                getMinimumCropZoom(
                                    nextMediaSize,
                                    cropSizeRef.current,
                                    rotation,
                                ),
                            ),
                        );
                    }}
                    onCropSizeChange={(nextCropSize) => {
                        cropSizeRef.current = nextCropSize;
                        setCropSize(nextCropSize);
                        setZoom((currentZoom) =>
                            Math.max(
                                currentZoom,
                                getMinimumCropZoom(
                                    mediaSizeRef.current,
                                    nextCropSize,
                                    rotation,
                                ),
                            ),
                        );
                    }}
                    transform={`translate(${crop.x}px, ${crop.y}px) rotate(${rotation}deg) scale(${zoom}) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`}
                    classes={{
                        cropAreaClassName: 'rounded-xl border-2 border-primary',
                    }}
                    cropperProps={{
                        'aria-label': 'Enquadramento da foto do produto',
                    }}
                />
            </div>

            <div className="grid gap-4 overflow-y-auto px-4 py-5 sm:px-0 sm:pb-0">
                <div className="grid gap-2">
                    <label
                        htmlFor="product-photo-zoom"
                        className="text-sm font-medium"
                    >
                        Aproximar foto
                    </label>
                    <input
                        id="product-photo-zoom"
                        type="range"
                        min={minimumZoom}
                        max={maximumZoom}
                        step={0.01}
                        value={zoom}
                        onChange={(event) =>
                            setZoom(Number(event.target.value))
                        }
                        className="h-12 w-full accent-primary"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => rotate(-90)}
                        disabled={isApplying}
                        className="h-12"
                    >
                        <RotateCcw />
                        Esquerda
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => rotate(90)}
                        disabled={isApplying}
                        className="h-12"
                    >
                        <RotateCw />
                        Direita
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            setFlip((current) => ({
                                ...current,
                                horizontal: !current.horizontal,
                            }))
                        }
                        disabled={isApplying}
                        aria-pressed={flip.horizontal}
                        className="h-12"
                    >
                        <FlipHorizontal2 />
                        Espelhar
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            setFlip((current) => ({
                                ...current,
                                vertical: !current.vertical,
                            }))
                        }
                        disabled={isApplying}
                        aria-pressed={flip.vertical}
                        className="h-12"
                    >
                        <FlipVertical2 />
                        Inverter
                    </Button>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    onClick={reset}
                    disabled={isApplying}
                    className="h-12"
                >
                    <Undo2 />
                    Restaurar enquadramento
                </Button>

                {error && (
                    <p
                        role="alert"
                        className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                        {error}
                    </p>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                    {source.origin === 'camera' && onRetake ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onRetake}
                            disabled={isApplying}
                            className="h-12"
                        >
                            Tirar novamente
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            disabled={isApplying}
                            className="h-12"
                        >
                            Cancelar
                        </Button>
                    )}
                    <Button
                        type="button"
                        onClick={apply}
                        disabled={isApplying || !croppedAreaPixels}
                        className="h-12"
                    >
                        {isApplying ? 'Preparando...' : 'Usar foto'}
                    </Button>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open onOpenChange={(open) => !open && onCancel()}>
                <DrawerContent className="h-[96dvh] max-h-[96dvh]">
                    <DrawerHeader className="pb-4">
                        <DrawerTitle>Ajustar foto</DrawerTitle>
                        <DrawerDescription>
                            Defina o enquadramento que será usado no catálogo.
                        </DrawerDescription>
                    </DrawerHeader>
                    {content}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Ajustar foto</DialogTitle>
                    <DialogDescription>
                        Defina o enquadramento que será usado no catálogo.
                    </DialogDescription>
                </DialogHeader>
                {content}
            </DialogContent>
        </Dialog>
    );
}
