import { router } from '@inertiajs/react';
import { TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { destroy } from '@/actions/App/Http/Controllers/ProductController';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import type { Product } from '@/types';

export function ProductDeleteDialog({
    product,
    onClose,
    onDeletingChange,
}: {
    product: Product | null;
    onClose: () => void;
    onDeletingChange?: (deleting: boolean) => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        if (!product) {
            return;
        }

        setDeleting(true);
        onDeletingChange?.(true);
        router.delete(destroy.url(product.id), {
            preserveScroll: true,
            onError: (errors) => {
                toast.error(Object.values(errors).join(' '), {
                    closeButton: true,
                    duration: Infinity,
                });
            },
            onFinish: () => {
                setDeleting(false);
                onDeletingChange?.(false);
                onClose();
            },
        });
    };

    return (
        <ConfirmationDialog
            open={product !== null}
            onOpenChange={(open) => !open && !deleting && onClose()}
            title="Excluir produto?"
            description={
                product
                    ? `“${product.name}” será movido para a lixeira, junto com suas fotos, tamanhos e estoque.`
                    : ''
            }
            confirmLabel={deleting ? 'Excluindo...' : 'Excluir produto'}
            confirmIcon={<TrashIcon />}
            cancelLabel="Cancelar"
            cancelVariant="ghost"
            onConfirm={handleDelete}
            destructive
            disabled={deleting}
        />
    );
}
