import { ImageBrokenIcon } from '@phosphor-icons/react';
import ImageCarousel from '@/components/image-carousel';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

export function ProductImage({
    product,
    className,
    iconClassName,
}: {
    product: Product;
    className?: string;
    iconClassName?: string;
}) {
    const coverImage = product.images[0];

    if (coverImage) {
        return (
            <img
                src={coverImage.thumb_url ?? coverImage.url}
                alt={product.name}
                className={cn('size-full object-cover', className)}
                loading="lazy"
                decoding="async"
            />
        );
    }

    return (
        <div
            className={cn(
                'flex size-full items-center justify-center text-featured-card-muted',
                className,
            )}
            aria-label="Produto sem foto"
        >
            <ImageBrokenIcon className={cn('size-5', iconClassName)} />
        </div>
    );
}

export function ProductImageButton({
    product,
    onOpenGallery,
    showImageCount = true,
    carousel = false,
    dense = false,
    className,
    iconClassName,
}: {
    product: Product;
    onOpenGallery: (product: Product) => void;
    showImageCount?: boolean;
    carousel?: boolean;
    /** Controles menores do carrossel para cards estreitos. */
    dense?: boolean;
    className?: string;
    iconClassName?: string;
}) {
    const coverImage = product.images[0];

    if (!coverImage) {
        return (
            <ProductImage
                product={product}
                className={className}
                iconClassName={iconClassName}
            />
        );
    }

    if (carousel) {
        return (
            <ImageCarousel
                images={product.images.map(
                    (image) => image.thumb_url ?? image.url,
                )}
                alt={product.name}
                compact
                dense={dense}
                onImageClick={() => onOpenGallery(product)}
                imageClickTestId={`abrir-galeria-produto-${product.id}`}
                imageClickAriaLabel={() =>
                    `Abrir galeria de imagens de ${product.name}`
                }
            />
        );
    }

    return (
        <button
            type="button"
            data-testid={`abrir-galeria-produto-${product.id}`}
            aria-label={`Abrir galeria de imagens de ${product.name}`}
            onClick={() => onOpenGallery(product)}
            className={cn(
                'group/image relative block size-full overflow-hidden text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                className,
            )}
        >
            <ProductImage product={product} />
            {showImageCount && product.images.length > 1 && (
                <span className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-foreground/75 px-2 py-1 text-[10px] font-semibold text-background tabular-nums backdrop-blur-sm">
                    {product.images.length} fotos
                </span>
            )}
        </button>
    );
}
