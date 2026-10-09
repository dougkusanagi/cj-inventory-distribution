import { useEffect, useRef } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useScrollVisibility } from "@/hooks/use-scroll-visibility";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem as BreadcrumbItemType } from "@/types";

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { isVisible, show } = useScrollVisibility();
    const headerRef = useRef<HTMLElement>(null);

    // Elementos sticky da página usam esta variável para ficar abaixo do
    // cabeçalho enquanto ele está visível e colar no topo quando ele some.
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty(
            "--app-header-offset",
            isVisible ? `${headerRef.current?.offsetHeight ?? 0}px` : "0px",
        );
    }, [isVisible]);

    useEffect(
        () => () => {
            document.documentElement.style.removeProperty(
                "--app-header-offset",
            );
        },
        [],
    );

    return (
        <header
            ref={headerRef}
            onFocusCapture={show}
            className={cn(
                "sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 bg-background/95 px-6 backdrop-blur transition-[translate,width,height] duration-200 ease-in-out will-change-[translate] group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4",
                isVisible ? "translate-y-0" : "-translate-y-full",
            )}
        >
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
        </header>
    );
}
