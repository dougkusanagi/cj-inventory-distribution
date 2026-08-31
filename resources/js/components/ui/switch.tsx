import * as TogglePrimitive from '@radix-ui/react-toggle';
import * as React from 'react';
import { cn } from '@/lib/utils';

function Switch({
    className,
    pressed,
    ...props
}: React.ComponentProps<typeof TogglePrimitive.Root>) {
    return (
        <TogglePrimitive.Root
            data-slot="switch"
            role="switch"
            pressed={pressed}
            aria-checked={pressed}
            aria-pressed={undefined}
            className={cn(
                'group inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent bg-input shadow-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=on]:bg-primary',
                className,
            )}
            {...props}
        >
            <span className="pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform group-data-[state=on]:translate-x-4 group-data-[state=off]:translate-x-0" />
        </TogglePrimitive.Root>
    );
}

export { Switch };
