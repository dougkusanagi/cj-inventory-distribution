import * as React from 'react';

import { fieldSurfaceClassName } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                fieldSurfaceClassName,
                'placeholder:text-muted-foreground caret-highlight flex min-h-28 w-full min-w-0 resize-y px-4 py-3 text-base leading-relaxed md:text-sm',
                className,
            )}
            {...props}
        />
    );
}

export { Textarea };
