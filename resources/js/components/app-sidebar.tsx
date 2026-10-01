import { Link } from '@inertiajs/react';
import {
    ArrowsLeftRightIcon,
    ClipboardTextIcon,
    ShoppingCartIcon,
    SquaresFourIcon,
    TShirtIcon,
    TagIcon,
    DropIcon,
    WarehouseIcon,
    NewspaperIcon,
} from '@phosphor-icons/react';
import AppLogo from '@/components/app-logo';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { changelog, dashboard } from '@/routes';
import { index as productsIndex } from '@/routes/products';
import { index as washTypesIndex } from '@/routes/wash-types';
import { index as categoriesIndex } from '@/routes/categories';
import { index as ordersIndex } from '@/routes/orders';
import { index as stockMovementsIndex } from '@/routes/stock-movements';
import { index as inventoryIndex } from '@/routes/inventory';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Painel',
        href: dashboard(),
        icon: SquaresFourIcon,
        exact: true,
    },
    {
        title: 'Produtos',
        href: productsIndex(),
        icon: TShirtIcon,
    },
    {
        title: 'Categorias',
        href: categoriesIndex(),
        icon: TagIcon,
    },
    { title: 'Tipos de lavagem', href: washTypesIndex(), icon: DropIcon },
    {
        title: 'Pedidos',
        href: ordersIndex(),
        icon: ShoppingCartIcon,
    },
    {
        title: 'Estoque',
        href: inventoryIndex(),
        icon: WarehouseIcon,
        items: [
            {
                title: 'Balanço de estoque',
                href: inventoryIndex(),
                icon: ClipboardTextIcon,
            },
            {
                title: 'Histórico de estoque',
                href: stockMovementsIndex(),
                icon: ArrowsLeftRightIcon,
            },
        ],
    },
    { title: 'Novidades', href: changelog(), icon: NewspaperIcon },
];

export function AppSidebar() {
    const { isMobile, state } = useSidebar();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <AppearanceToggleTab
                    collapsed={!isMobile && state === 'collapsed'}
                    className="mt-auto"
                />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
