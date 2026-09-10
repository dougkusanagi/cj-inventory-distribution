import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { useCallback, useEffect, useState, type WheelEvent } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Product } from '@/types';

type ProductImageGalleryProps = {
    product: Product | null;
    open: boolean;
    selectedIndex: number;
    onOpenChange: (open: boolean) => void;
    onSelectedIndexChange: (index: number) => void;
};

export default function ProductImageGallery({
    product,
    open,
    selectedIndex,
    onOpenChange,
    onSelectedIndexChange,
}: ProductImageGalleryProps) {
    const images = product?.images ?? [];
    const activeIndex = Math.min(selectedIndex, Math.max(images.length - 1, 0));
    const selectedImage = images[activeIndex] ?? null;
    const hasMultipleImages = images.length > 1;
    const [zoom, setZoom] = useState(1);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: true,
        loop: hasMultipleImages,
    });

    const goToImage = useCallback(
        (index: number) => {
            onSelectedIndexChange(index);
            emblaApi?.scrollTo(index);
        },
        [emblaApi, onSelectedIndexChange],
    );

    const goToPreviousImage = useCallback(() => {
        if (images.length === 0) {
            return;
        }

        goToImage((activeIndex - 1 + images.length) % images.length);
    }, [activeIndex, goToImage, images.length]);

    const goToNextImage = useCallback(() => {
        if (images.length === 0) {
            return;
        }

        goToImage((activeIndex + 1) % images.length);
    }, [activeIndex, goToImage, images.length]);

    const handleThumbnailSelect = useCallback(() => {
        if (!emblaApi) {
            return;
        }

        onSelectedIndexChange(emblaApi.selectedScrollSnap());
    }, [emblaApi, onSelectedIndexChange]);

    useEffect(() => {
        if (!emblaApi) {
            return;
        }

        emblaApi.on('select', handleThumbnailSelect);
        emblaApi.on('reInit', handleThumbnailSelect);

        return () => {
            emblaApi.off('select', handleThumbnailSelect);
            emblaApi.off('reInit', handleThumbnailSelect);
        };
    }, [emblaApi, handleThumbnailSelect]);

    useEffect(() => {
        if (!emblaApi || images.length === 0) {
            return;
        }

        emblaApi.scrollTo(activeIndex, true);
    }, [activeIndex, emblaApi, images.length]);

    useEffect(() => {
        if (!open || !hasMultipleImages) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToPreviousImage();
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToNextImage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNextImage, goToPreviousImage, hasMultipleImages, open]);

    useEffect(() => {
        if (open) {
            setZoom(1);
            setImageLoaded(false);
        }
    }, [open, selectedImage?.id]);

    const handleImageWheel = useCallback(
        (event: WheelEvent<HTMLDivElement>) => {
            event.preventDefault();
            setZoom((currentZoom) =>
                Math.min(
                    4,
                    Math.max(1, currentZoom + (event.deltaY < 0 ? 0.1 : -0.1)),
                ),
            );
        },
        [],
    );

    if (!product || selectedImage === null) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                data-testid={`galeria-produto-${product.id}`}
                className="flex max-h-[92dvh] w-[min(96vw,1200px)] max-w-none flex-col gap-0 overflow-hidden rounded-[1.5rem] border-white/10 bg-[#090a0c] p-0 text-white shadow-[0_24px_100px_rgba(0,0,0,0.55)] sm:max-w-none [&>button]:top-4 [&>button]:right-4 [&>button]:z-20 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-black/35 [&>button]:p-2 [&>button]:text-white [&>button]:backdrop-blur-md [&>button]:hover:bg-white/10 [&>button]:hover:opacity-100 [&>button]:focus:ring-white/40"
            >
                <DialogTitle className="sr-only">
                    Galeria de imagens de {product.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Use a roda do mouse ou o controle de zoom para aproximar a
                    imagem. Arraste as miniaturas ou use as setas para mudar a
                    imagem selecionada.
                </DialogDescription>

                <div className="flex min-h-0 flex-col bg-[#090a0c]">
                    <div
                        className={`relative flex min-w-0 items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.07),_transparent_54%),_linear-gradient(135deg,_#16181c,_#090a0c)] p-2 sm:p-5 md:p-8 ${imageLoaded ? '' : 'min-h-[8rem] sm:min-h-[12rem] md:min-h-[16rem]'}`}
                    >
                        <div
                            data-testid={`galeria-imagem-produto-${product.id}`}
                            className={`flex max-w-full items-center justify-center overflow-hidden rounded-lg bg-black/10 ${zoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                            onWheel={handleImageWheel}
                        >
                            <img
                                key={selectedImage.id}
                                src={selectedImage.url}
                                alt={`${product.name} — imagem ${activeIndex + 1}`}
                                className="block max-h-[calc(92dvh-13rem)] max-w-full animate-in object-contain transition-transform duration-150 fade-in-0 md:max-h-[calc(92dvh-18rem)]"
                                style={{ transform: `scale(${zoom})` }}
                                onLoad={(event) =>
                                    setImageLoaded(
                                        event.currentTarget.naturalWidth > 64 &&
                                            event.currentTarget.naturalHeight >
                                                64,
                                    )
                                }
                                draggable={false}
                            />
                        </div>

                        {hasMultipleImages && (
                            <>
                                <button
                                    type="button"
                                    aria-label={`Imagem anterior de ${product.name}`}
                                    onClick={goToPreviousImage}
                                    className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/90 shadow-xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/55 hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:left-5"
                                >
                                    <ChevronLeft className="size-5" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Próxima imagem de ${product.name}`}
                                    onClick={goToNextImage}
                                    className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/90 shadow-xl backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/55 hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:right-5"
                                >
                                    <ChevronRight className="size-5" />
                                </button>
                            </>
                        )}
                    </div>

                    <div className="relative border-t border-white/10 bg-black/25 px-3 py-3 sm:px-6 sm:py-4">
                        <div className="mb-3 grid gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                            <label
                                htmlFor={`galeria-zoom-${product.id}`}
                                className="text-[11px] font-medium text-white/70"
                            >
                                Aproximar foto
                            </label>
                            <input
                                id={`galeria-zoom-${product.id}`}
                                aria-label={`Zoom da imagem de ${product.name}`}
                                type="range"
                                min="1"
                                max="4"
                                step="0.01"
                                value={zoom}
                                onChange={(event) =>
                                    setZoom(Number(event.target.value))
                                }
                                className="h-8 w-full accent-primary"
                            />
                            <output
                                htmlFor={`galeria-zoom-${product.id}`}
                                className="text-right text-[11px] text-white/55 tabular-nums"
                            >
                                {Math.round(zoom * 100)}%
                            </output>
                        </div>
                        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-white/60">
                            <span className="inline-flex items-center gap-1.5 tabular-nums">
                                <Images
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                {activeIndex + 1} de {images.length}
                            </span>
                            {hasMultipleImages && (
                                <span className="hidden sm:inline">
                                    Arraste para navegar
                                </span>
                            )}
                        </div>

                        <div className="relative">
                            {hasMultipleImages && (
                                <>
                                    <button
                                        type="button"
                                        aria-label={`Miniatura anterior de ${product.name}`}
                                        onClick={goToPreviousImage}
                                        className="absolute top-1/2 left-0 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white/90 shadow-lg backdrop-blur-md transition hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    >
                                        <ChevronLeft className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Próxima miniatura de ${product.name}`}
                                        onClick={goToNextImage}
                                        className="absolute top-1/2 right-0 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white/90 shadow-lg backdrop-blur-md transition hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    >
                                        <ChevronRight className="size-4" />
                                    </button>
                                </>
                            )}

                            <div
                                ref={emblaRef}
                                className="overflow-hidden px-10 sm:px-12"
                                aria-label="Miniaturas das imagens do produto"
                            >
                                <div className="flex touch-pan-y gap-3">
                                    {images.map((image, index) => (
                                        <div
                                            key={image.id}
                                            className="min-w-0 shrink-0 basis-[4.5rem] sm:basis-24"
                                        >
                                            <button
                                                type="button"
                                                aria-label={`Ver imagem ${index + 1} de ${product.name}`}
                                                aria-current={
                                                    index === activeIndex
                                                        ? 'true'
                                                        : undefined
                                                }
                                                onClick={() => goToImage(index)}
                                                className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-black/20 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                                                    index === activeIndex
                                                        ? 'border-primary shadow-[0_0_0_2px_color-mix(in_srgb,var(--primary)_22%,transparent),0_8px_24px_rgba(0,0,0,0.28)]'
                                                        : 'border-white/10 opacity-55 hover:scale-[1.03] hover:border-white/35 hover:opacity-100'
                                                }`}
                                            >
                                                <img
                                                    src={
                                                        image.thumb_url ??
                                                        image.url
                                                    }
                                                    alt={`${product.name} — miniatura ${index + 1}`}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover"
                                                    draggable={false}
                                                />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
