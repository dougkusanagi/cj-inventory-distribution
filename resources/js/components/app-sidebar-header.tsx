import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useScrollVisibility } from '@/hooks/use-scroll-visibility';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { isVisible, show } = useScrollVisibility();

    return (
        <header
            onFocusCapture={show}
            className={cn(
                'sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 bg-background/95 px-6 backdrop-blur transition-[transform,width,height] duration-200 ease-out will-change-transform group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4',
                isVisible ? 'translate-y-0' : '-translate-y-full',
            )}
        >
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
        </header>
    );
}
