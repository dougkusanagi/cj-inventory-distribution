import type { FormEventHandler, ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

export function RevisionDrawer({
    title,
    description,
    onClose,
    onSubmit,
    submitLabel,
    processing,
    error,
    children,
    extraAction,
}: {
    title: string;
    description: string;
    onClose: () => void;
    onSubmit?: FormEventHandler<HTMLFormElement>;
    submitLabel?: string;
    processing?: boolean;
    error?: string;
    children: ReactNode;
    extraAction?: ReactNode;
}) {
    const side = useIsMobile() ? 'bottom' : 'right';

    return (
        <Drawer
            open
            direction={side}
            onOpenChange={(open) => {
                if (!open && !processing) onClose();
            }}
        >
            <DrawerContent side={side}>
                <DrawerHeader>
                    <DrawerTitle>{title}</DrawerTitle>
                    <DrawerDescription>{description}</DrawerDescription>
                </DrawerHeader>
                {onSubmit ? (
                    <form
                        onSubmit={onSubmit}
                        className="flex min-h-0 flex-col gap-4"
                    >
                        <div className="grid gap-4 overflow-y-auto px-6">
                            <InputError message={error} />
                            {children}
                        </div>
                        <DrawerFooter>
                            {extraAction}
                            <Button
                                type="submit"
                                className="h-11"
                                disabled={processing}
                            >
                                {processing ? 'Salvando…' : submitLabel}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11"
                                disabled={processing}
                                onClick={onClose}
                            >
                                Cancelar
                            </Button>
                        </DrawerFooter>
                    </form>
                ) : (
                    <>
                        <div className="grid min-h-0 gap-3 overflow-y-auto px-6 pb-4">
                            {children}
                        </div>
                        <DrawerFooter>
                            <Button
                                variant="outline"
                                className="h-11"
                                onClick={onClose}
                            >
                                Fechar
                            </Button>
                        </DrawerFooter>
                    </>
                )}
            </DrawerContent>
        </Drawer>
    );
}
