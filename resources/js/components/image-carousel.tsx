import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type ImageCarouselProps = {
    images: string[];
    alt: string;
    fallbackImage?: string;
    loading?: 'lazy' | 'eager';
    compact?: boolean;
    previousTestId?: string;
    nextTestId?: string;
    imageTestId?: string;
    onImageClick?: () => void;
};

export default function ImageCarousel({
    images,
    alt,
    fallbackImage,
    loading = 'lazy',
    compact = false,
    previousTestId,
    nextTestId,
    imageTestId,
    onImageClick,
}: ImageCarouselProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: images.length > 1,
    });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [failedImages, setFailedImages] = useState<Record<string, string>>(
        {},
    );

    const scrollTo = useCallback(
        (index: number) => {
            emblaApi?.scrollTo(index);
        },
        [emblaApi],
    );

    const onSelect = useCallback(() => {
        if (!emblaApi) {
            return;
        }

        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) {
            return;
        }

        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);

        return () => {
            emblaApi.off('select', onSelect);
            emblaApi.off('reInit', onSelect);
        };
    }, [emblaApi, onSelect]);

    const renderImage = (src: string, index: number) => {
        const failedImageKey = `${src}|${fallbackImage ?? ''}`;
        const fallbackSrc = failedImages[failedImageKey];

        return (
            <img
                src={fallbackSrc ?? src}
                alt={`${alt} - Imagem ${index + 1}`}
                loading={loading}
                referrerPolicy="no-referrer"
                draggable={false}
                data-testid={
                    imageTestId === undefined
                        ? undefined
                        : index === 0
                          ? imageTestId
                          : `${imageTestId}-${index}`
                }
                onError={() => {
                    if (
                        !fallbackImage ||
                        fallbackImage === src ||
                        fallbackSrc === fallbackImage
                    ) {
                        return;
                    }

                    setFailedImages((current) => ({
                        ...current,
                        [failedImageKey]: fallbackImage,
                    }));
                }}
                className="size-full object-cover select-none"
            />
        );
    };

    return (
        <div
            ref={emblaRef}
            className="group/carousel relative size-full overflow-hidden"
        >
            <div className="flex size-full touch-pan-y">
                {images.map((src, index) => (
                    <div
                        className="relative min-w-0 flex-[0_0_100%]"
                        key={`${src}-${index}`}
                    >
                        {onImageClick ? (
                            <button
                                type="button"
                                onClick={onImageClick}
                                className="absolute inset-0 size-full cursor-zoom-in text-left outline-none"
                                aria-label={
                                    index === 0
                                        ? `Ver sacos de ${alt}`
                                        : `Ver sacos de ${alt}, imagem ${index + 1}`
                                }
                            >
                                {renderImage(src, index)}
                            </button>
                        ) : (
                            renderImage(src, index)
                        )}
                    </div>
                ))}
            </div>

            {images.length > 1 && (
                <>
                    <button
                        type="button"
                        data-testid={previousTestId}
                        aria-label={`Imagem anterior de ${alt}`}
                        onClick={() => emblaApi?.scrollPrev()}
                        className={`absolute ${compact ? 'left-2 size-8' : 'left-4 size-10'} top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-foreground/65 text-background opacity-0 shadow-sm transition-all duration-200 group-hover/carousel:opacity-100 hover:bg-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
                    >
                        <ChevronLeft
                            className={compact ? 'size-4' : 'size-5'}
                        />
                    </button>
                    <button
                        type="button"
                        data-testid={nextTestId}
                        aria-label={`Próxima imagem de ${alt}`}
                        onClick={() => emblaApi?.scrollNext()}
                        className={`absolute ${compact ? 'right-2 size-8' : 'right-4 size-10'} top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-foreground/65 text-background opacity-0 shadow-sm transition-all duration-200 group-hover/carousel:opacity-100 hover:bg-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
                    >
                        <ChevronRight
                            className={compact ? 'size-4' : 'size-5'}
                        />
                    </button>
                    <div
                        role="group"
                        aria-label={`Imagem ${selectedIndex + 1} de ${images.length}`}
                        className={`absolute ${compact ? 'bottom-3 px-2.5 py-1.5' : 'bottom-4 px-3 py-2'} left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-foreground/45 backdrop-blur-sm`}
                    >
                        {images.map((_, index) => (
                            <button
                                type="button"
                                key={index}
                                aria-label={`Ir para a imagem ${index + 1}`}
                                aria-current={
                                    index === selectedIndex ? 'true' : undefined
                                }
                                onClick={() => scrollTo(index)}
                                className={`block rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                                    index === selectedIndex
                                        ? compact
                                            ? 'h-1.5 w-4 bg-background'
                                            : 'h-2 w-5 bg-background'
                                        : compact
                                          ? 'size-1.5 bg-background/45'
                                          : 'size-2 bg-background/40'
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
