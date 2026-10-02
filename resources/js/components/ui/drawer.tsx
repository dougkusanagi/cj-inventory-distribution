import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@/lib/utils';

function Drawer({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
    return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
    return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
    return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
    return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
    return (
        <DrawerPrimitive.Overlay
            data-slot="drawer-overlay"
            className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]', className)}
            {...props}
        />
    );
}

function DrawerContent({
    className,
    children,
    side = 'bottom',
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & { side?: 'bottom' | 'right' | 'left' }) {
    return (
        <DrawerPortal>
            <DrawerOverlay />
            <DrawerPrimitive.Content
                data-slot="drawer-content"
                className={cn(
                    'bg-background fixed z-50 flex flex-col shadow-2xl outline-none',
                    side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[2rem] border-t',
                    side === 'right' && 'inset-y-2 right-2 w-[calc(100%-3.5rem)] max-w-md rounded-2xl border after:hidden!',
                    side === 'left' && 'inset-y-2 left-2 w-[calc(100%-3.5rem)] max-w-md rounded-2xl border after:hidden!',
                    className,
                )}
                {...props}
            >
                {side === 'bottom' && <div className="bg-muted-foreground/35 mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full" />}
                {side !== 'bottom' && (
                    <div
                        aria-hidden="true"
                        className={cn(
                            'bg-muted-foreground/35 pointer-events-none absolute top-1/2 z-10 h-12 w-1.5 -translate-y-1/2 rounded-full',
                            side === 'right' ? 'left-2' : 'right-2',
                        )}
                    />
                )}
                {children}
            </DrawerPrimitive.Content>
        </DrawerPortal>
    );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="drawer-header" className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="drawer-footer" className={cn('mt-auto flex flex-col gap-2 p-6 pt-0', className)} {...props} />;
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
    return <DrawerPrimitive.Title data-slot="drawer-title" className={cn('text-foreground text-lg font-semibold', className)} {...props} />;
}

function DrawerDescription({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
    return <DrawerPrimitive.Description data-slot="drawer-description" className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

export { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerPortal, DrawerOverlay, DrawerTitle, DrawerTrigger };
