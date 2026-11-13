import { Link, usePage } from '@inertiajs/react';
import { CaretDownIcon, ListIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import AppLogo from '@/components/app-logo';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { useMainNavigation } from '@/hooks/use-main-navigation';
import { useScrollVisibility } from '@/hooks/use-scroll-visibility';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const focusStyles =
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

const desktopItemStyles = cn(
    'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold tracking-[-0.01em] whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow] duration-200 hover:bg-accent hover:text-foreground',
    focusStyles,
);

const mobileItemStyles = cn(
    'flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
    focusStyles,
);

const activeItemStyles =
    'bg-foreground text-background shadow-sm hover:bg-foreground/90 hover:text-background';

export function AppHeader({ breadcrumbs = [] }: Props) {
    const { auth } = usePage().props;
    const getInitials = useInitials();
    const { items, changelogItem, isItemActive } = useMainNavigation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { isVisible, show } = useScrollVisibility();
    const headerRef = useRef<HTMLDivElement>(null);

    // Elementos sticky da página usam esta variável para ficar abaixo do
    // cabeçalho enquanto ele está visível e colar no topo quando ele some.
    useEffect(() => {
        document.documentElement.style.setProperty(
            '--app-header-offset',
            isVisible ? `${headerRef.current?.offsetHeight ?? 0}px` : '0px',
        );
    }, [isVisible]);

    useEffect(
        () => () => {
            document.documentElement.style.removeProperty(
                '--app-header-offset',
            );
        },
        [],
    );

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div
            ref={headerRef}
            onFocusCapture={show}
            className={cn(
                'sticky top-0 z-40 transition-[translate] duration-200 ease-in-out will-change-[translate]',
                isVisible ? 'translate-y-0' : '-translate-y-full',
            )}
        >
            <header className="border-b border-border/80 bg-background/90 shadow-sm shadow-black/[0.02] backdrop-blur-xl">
                <div className="mx-auto flex h-[4.5rem] items-center gap-3 px-4 md:max-w-[96rem] md:px-6 xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-7">
                    <div className="xl:hidden">
                        <Drawer
                            direction="left"
                            open={mobileMenuOpen}
                            onOpenChange={setMobileMenuOpen}
                        >
                            <DrawerTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-11 rounded-xl"
                                    aria-label="Abrir menu de navegação"
                                    data-test="mobile-menu-button"
                                >
                                    <ListIcon />
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent
                                side="left"
                                className="flex flex-col p-3"
                            >
                                <DrawerTitle className="sr-only">
                                    Menu de navegação
                                </DrawerTitle>
                                <DrawerHeader className="border-b border-border px-2 pb-5 text-left">
                                    <AppLogo />
                                </DrawerHeader>
                                <nav
                                    aria-label="Navegação principal"
                                    className="flex flex-1 flex-col gap-1 overflow-y-auto px-1 py-5"
                                >
                                    {[...items, changelogItem].map((item) =>
                                        item.items?.length ? (
                                            <div
                                                key={item.title}
                                                className="mt-3 border-t border-border pt-4"
                                            >
                                                <p className="px-3.5 pb-2 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                                                    {item.title}
                                                </p>
                                                {item.items.map((child) => (
                                                    <Link
                                                        key={child.title}
                                                        href={child.href}
                                                        prefetch
                                                        onClick={
                                                            closeMobileMenu
                                                        }
                                                        aria-current={
                                                            isItemActive(child)
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                        className={cn(
                                                            mobileItemStyles,
                                                            isItemActive(
                                                                child,
                                                            ) &&
                                                                activeItemStyles,
                                                        )}
                                                    >
                                                        {child.icon && (
                                                            <child.icon className="size-5 shrink-0" />
                                                        )}
                                                        <span>
                                                            {child.title}
                                                        </span>
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                prefetch
                                                onClick={closeMobileMenu}
                                                aria-current={
                                                    isItemActive(item)
                                                        ? 'page'
                                                        : undefined
                                                }
                                                className={cn(
                                                    mobileItemStyles,
                                                    isItemActive(item) &&
                                                        activeItemStyles,
                                                )}
                                            >
                                                {item.icon && (
                                                    <item.icon className="size-5 shrink-0" />
                                                )}
                                                <span>{item.title}</span>
                                            </Link>
                                        ),
                                    )}
                                </nav>
                                <div className="border-t border-border px-1 pt-4">
                                    <p className="px-2.5 pb-2 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                                        Tema
                                    </p>
                                    <AppearanceToggleTab />
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>

                    <Link
                        href={dashboard()}
                        prefetch
                        className={cn(
                            'flex shrink-0 items-center rounded-lg',
                            focusStyles,
                        )}
                    >
                        <AppLogo />
                    </Link>

                    <nav
                        aria-label="Navegação principal"
                        className="hidden min-w-0 items-center justify-center xl:flex"
                    >
                        <div className="flex min-w-0 items-center gap-0.5 rounded-2xl border border-border/80 bg-muted/60 p-1.5">
                            {items.map((item) =>
                                item.items?.length ? (
                                    <DropdownMenu key={item.title}>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className={cn(
                                                    desktopItemStyles,
                                                    isItemActive(item) &&
                                                        activeItemStyles,
                                                )}
                                            >
                                                {item.icon && (
                                                    <item.icon className="hidden size-4 shrink-0 2xl:block" />
                                                )}
                                                {item.title}
                                                <CaretDownIcon
                                                    weight="bold"
                                                    className="size-4"
                                                />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="start"
                                            className="w-64 rounded-2xl p-2"
                                        >
                                            {item.items.map((child) => (
                                                <DropdownMenuItem
                                                    key={child.title}
                                                    asChild
                                                    className="cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold"
                                                >
                                                    <Link
                                                        href={child.href}
                                                        prefetch
                                                        aria-current={
                                                            isItemActive(child)
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                        className="flex w-full items-center gap-3"
                                                    >
                                                        {child.icon && (
                                                            <child.icon className="size-5 shrink-0 text-muted-foreground" />
                                                        )}
                                                        <span>
                                                            {child.title}
                                                        </span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Link
                                        key={item.title}
                                        href={item.href}
                                        prefetch
                                        aria-current={
                                            isItemActive(item)
                                                ? 'page'
                                                : undefined
                                        }
                                        className={cn(
                                            desktopItemStyles,
                                            isItemActive(item) &&
                                                activeItemStyles,
                                        )}
                                    >
                                        {item.icon && (
                                            <item.icon className="hidden size-4 shrink-0 2xl:block" />
                                        )}
                                        {item.title}
                                    </Link>
                                ),
                            )}
                        </div>
                    </nav>

                    <div className="ml-auto flex items-center gap-3 xl:ml-0 xl:justify-self-end">
                        {changelogItem.icon && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    'hidden size-10 rounded-xl xl:inline-flex',
                                    isItemActive(changelogItem) &&
                                        activeItemStyles,
                                )}
                                asChild
                            >
                                <Link
                                    href={changelogItem.href}
                                    prefetch
                                    aria-label={changelogItem.title}
                                    title={changelogItem.title}
                                    aria-current={
                                        isItemActive(changelogItem)
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    <changelogItem.icon />
                                </Link>
                            </Button>
                        )}
                        <AppearanceToggleTab
                            collapsed
                            dropdownSide="bottom"
                            className="hidden xl:flex"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-11 rounded-xl border border-border bg-card p-1 shadow-sm"
                                    aria-label="Abrir menu da conta"
                                    data-test="user-menu-button"
                                >
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user?.avatar}
                                            alt={auth.user?.name}
                                        />
                                        <AvatarFallback className="rounded-lg bg-muted text-foreground">
                                            {getInitials(auth.user?.name ?? '')}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                {auth.user && (
                                    <UserMenuContent user={auth.user} />
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>
            {breadcrumbs.length > 1 && (
                <div className="flex w-full border-b border-border/70 bg-muted/80">
                    <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-muted-foreground md:max-w-[96rem] md:px-6">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </div>
    );
}
