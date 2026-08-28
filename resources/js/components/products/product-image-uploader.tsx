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
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ProductImageUploaderProps = {
    value: File | null;
    existingUrl?: string | null;
    error?: string;
    onChange: (file: File | null) => void;
    onRemoveExisting: () => void;
};

type ImageTransform = {
    rotation: number;
    mirrored: boolean;
    cropped: boolean;
};

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = sourceUrl;
    });
}

async function transformImage(
    file: File,
    sourceUrl: string,
    transform: ImageTransform,
): Promise<File> {
    const image = await loadImage(sourceUrl);
    const radians = (transform.rotation * Math.PI) / 180;
    const cropWidth = transform.cropped
        ? Math.min(image.naturalWidth, image.naturalHeight)
        : image.naturalWidth;
    const cropHeight = transform.cropped
        ? Math.min(image.naturalWidth, image.naturalHeight)
        : image.naturalHeight;
    const canvas = document.createElement('canvas');
    const isSideways = transform.rotation === 90 || transform.rotation === 270;

    canvas.width = isSideways ? cropHeight : cropWidth;
    canvas.height = isSideways ? cropWidth : cropHeight;

    const context = canvas.getContext('2d');

    if (!context) {
        return file;
    }

    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(radians);
    context.scale(transform.mirrored ? -1 : 1, 1);
    context.drawImage(
        image,
        transform.cropped
            ? (cropWidth - image.naturalWidth) / 2
            : -image.naturalWidth / 2,
        transform.cropped
            ? (cropHeight - image.naturalHeight) / 2
            : -image.naturalHeight / 2,
        image.naturalWidth,
        image.naturalHeight,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );

    if (!blob) {
        return file;
    }

    return new File([blob], 'product-photo.jpg', { type: 'image/jpeg' });
}

export function ProductImageUploader({
    value,
    existingUrl = null,
    error,
    onChange,
    onRemoveExisting,
}: ProductImageUploaderProps) {
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(value);
    const [transform, setTransform] = useState<ImageTransform>({
        rotation: 0,
        mirrored: false,
        cropped: false,
    });
    const [processing, setProcessing] = useState(false);
    const objectUrl = useRef<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (objectUrl.current) {
                URL.revokeObjectURL(objectUrl.current);
            }
        };
    }, []);

    const applyTransform = async (nextTransform: ImageTransform) => {
        if (!sourceFile || !sourceUrl) {
            return;
        }

        setProcessing(true);

        try {
            onChange(
                await transformImage(sourceFile, sourceUrl, nextTransform),
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (objectUrl.current) {
            URL.revokeObjectURL(objectUrl.current);
        }

        const nextUrl = URL.createObjectURL(file);
        objectUrl.current = nextUrl;
        setSourceUrl(nextUrl);
        setSourceFile(file);
        setTransform({ rotation: 0, mirrored: false, cropped: false });
        onChange(file);
    };

    const handleRotate = (direction: 'left' | 'right') => {
        const rotation =
            (transform.rotation + (direction === 'right' ? 90 : 270)) % 360;
        const nextTransform = { ...transform, rotation };

        setTransform(nextTransform);
        void applyTransform(nextTransform);
    };

    const handleMirror = () => {
        const nextTransform = {
            ...transform,
            mirrored: !transform.mirrored,
        };

        setTransform(nextTransform);
        void applyTransform(nextTransform);
    };

    const handleCrop = () => {
        const nextTransform = { ...transform, cropped: true };

        setTransform(nextTransform);
        void applyTransform(nextTransform);
    };

    const handleReset = () => {
        const nextTransform = { rotation: 0, mirrored: false, cropped: false };

        setTransform(nextTransform);
        onChange(sourceFile);
    };

    const handleRemove = () => {
        if (sourceFile) {
            if (objectUrl.current) {
                URL.revokeObjectURL(objectUrl.current);
                objectUrl.current = null;
            }

            setSourceUrl(null);
            setSourceFile(null);
            setTransform({ rotation: 0, mirrored: false, cropped: false });
            onChange(null);

            if (inputRef.current) {
                inputRef.current.value = '';
            }

            return;
        }

        onRemoveExisting();
    };

    const previewUrl = sourceUrl ?? existingUrl;

    return (
        <div className="grid gap-4">
            <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-dashed border-border bg-muted">
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt="Pré-visualização da foto do produto"
                        className={cn(
                            'size-full object-cover transition-transform duration-300',
                            sourceUrl && 'scale-[1.01]',
                        )}
                        style={
                            sourceUrl
                                ? {
                                      transform: `rotate(${transform.rotation}deg) scaleX(${transform.mirrored ? -1 : 1})`,
                                  }
                                : undefined
                        }
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
                            Adicione uma foto da peça
                        </span>
                        <span className="max-w-48 text-xs leading-5 text-muted-foreground">
                            JPG, PNG ou WebP · até 5 MB
                        </span>
                    </button>
                )}

                {previewUrl && (
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-3 right-3 shadow-md"
                        onClick={handleRemove}
                        aria-label="Remover foto"
                    >
                        <Trash2 />
                    </Button>
                )}
            </div>

            <input
                ref={inputRef}
                id="product-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={handleFileChange}
            />

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                >
                    <Camera />
                    {previewUrl ? 'Trocar foto' : 'Escolher foto'}
                </Button>

                {sourceUrl && (
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
                            disabled={processing || transform.cropped}
                        >
                            <Crop />
                            Cortar
                        </Button>
                        {(transform.rotation !== 0 ||
                            transform.mirrored ||
                            transform.cropped) && (
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

            <InputError message={error} />
        </div>
    );
}
