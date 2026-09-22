import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items }: { items: NavItem[] }) {
    const { isCurrentOrParentUrl, isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile, state } = useSidebar();
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const isCompact = !isMobile && state === 'collapsed';

    const closeMobileMenu = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const isItemActive = (item: NavItem): boolean =>
        item.items?.length
            ? item.items.some((child) => isItemActive(child))
            : item.exact
              ? isCurrentUrl(item.href)
              : isCurrentOrParentUrl(item.href);

    const renderLink = (item: NavItem, subitem = false) => {
        const active = isItemActive(item);

        if (item.disabled) {
            return subitem ? (
                <SidebarMenuSubButton
                    aria-disabled="true"
                    className="pointer-events-none opacity-50"
                >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </SidebarMenuSubButton>
            ) : (
                <SidebarMenuButton
                    disabled
                    aria-label={`${item.title} indisponível por enquanto`}
                    tooltip={{
                        children: `${item.title} indisponível por enquanto`,
                    }}
                >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <span className="ml-auto text-xs font-semibold tracking-wide uppercase group-data-[collapsible=icon]:hidden">
                        Em breve
                    </span>
                </SidebarMenuButton>
            );
        }

        if (subitem) {
            return (
                <SidebarMenuSubButton asChild isActive={active}>
                    <Link href={item.href} prefetch onClick={closeMobileMenu}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuSubButton>
            );
        }

        return (
            <SidebarMenuButton
                asChild
                isActive={active}
                aria-label={item.title}
                tooltip={{ children: item.title }}
            >
                <Link href={item.href} prefetch onClick={closeMobileMenu}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
        );
    };

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const hasChildren = Boolean(item.items?.length);
                    const active = isItemActive(item);

                    if (!hasChildren) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                {renderLink(item)}
                            </SidebarMenuItem>
                        );
                    }

                    if (isCompact) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            isActive={active}
                                            aria-label={item.title}
                                            title={item.title}
                                        >
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        side="right"
                                        align="start"
                                        alignOffset={28}
                                        sideOffset={0}
                                        data-testid="compact-navigation"
                                        className="relative flex min-w-52 flex-col gap-1 overflow-visible rounded-none border-0 bg-sidebar p-2 text-sidebar-foreground shadow-none after:absolute after:top-1 after:bottom-6 after:-left-4 after:w-px after:bg-sidebar-border"
                                    >
                                        {item.items?.map((child) => (
                                            <DropdownMenuItem
                                                key={child.title}
                                                asChild
                                                disabled={child.disabled}
                                                className="relative overflow-visible bg-sidebar p-0 before:absolute before:top-1/2 before:-left-6 before:h-px before:w-6 before:bg-sidebar-border focus:bg-transparent"
                                            >
                                                <Link
                                                    href={child.href}
                                                    prefetch
                                                    aria-current={
                                                        isItemActive(child)
                                                            ? 'page'
                                                            : undefined
                                                    }
                                                    onClick={closeMobileMenu}
                                                    className="flex min-h-8 w-full items-center gap-2 rounded-md px-3 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:bg-sidebar-accent focus-visible:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium"
                                                >
                                                    {child.icon && (
                                                        <child.icon className="size-4 shrink-0" />
                                                    )}
                                                    <span>{child.title}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </SidebarMenuItem>
                        );
                    }

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            open={
                                !isCompact && (openGroups[item.title] ?? active)
                            }
                            onOpenChange={(open) => {
                                setOpenGroups((groups) => ({
                                    ...groups,
                                    [item.title]: open,
                                }));
                            }}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        isActive={active}
                                        aria-label={item.title}
                                        tooltip={{ children: item.title }}
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub className="relative border-l-0 after:absolute after:top-0 after:bottom-4 after:left-0 after:w-px after:bg-sidebar-border">
                                        {item.items?.map((child) => (
                                            <SidebarMenuSubItem
                                                key={child.title}
                                                className="before:absolute before:top-1/2 before:-left-2.5 before:h-px before:w-2.5 before:bg-sidebar-border"
                                            >
                                                {renderLink(child, true)}
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
