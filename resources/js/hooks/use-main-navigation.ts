import { usePage } from '@inertiajs/react';
import {
    ArrowsLeftRightIcon,
    ClipboardTextIcon,
    DropIcon,
    FactoryIcon,
    FlowArrowIcon,
    ImagesIcon,
    NewspaperIcon,
    PlusCircleIcon,
    ScissorsIcon,
    ShoppingCartIcon,
    SquaresFourIcon,
    TShirtIcon,
    TagIcon,
    UsersIcon,
    WarehouseIcon,
} from '@phosphor-icons/react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { changelog, dashboard } from '@/routes';
import { index as categoriesIndex } from '@/routes/categories';
import { index as inventoryIndex } from '@/routes/inventory';
import { index as materialsIndex } from '@/routes/materials';
import { index as ordersIndex } from '@/routes/orders';
import { index as productPhotosIndex } from '@/routes/product-photos';
import { index as productionIndex } from '@/routes/production';
import { index as productsIndex } from '@/routes/products';
import { index as stockMovementsIndex } from '@/routes/stock-movements';
import { index as technicalSheetsIndex } from '@/routes/technical-sheets';
import { index as usersIndex } from '@/routes/users';
import { index as washTypesIndex } from '@/routes/wash-types';
import type { NavItem } from '@/types';

const changelogItem: NavItem = {
    title: 'Novidades',
    href: changelog(),
    icon: NewspaperIcon,
};

const operationNavItems: NavItem[] = [
    { title: 'Painel', href: dashboard(), icon: SquaresFourIcon, exact: true },
    { title: 'Pedidos', href: ordersIndex(), icon: ShoppingCartIcon },
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
];

/**
 * Main menu items the current user may access, and how to tell which one is active.
 */
export function useMainNavigation(): {
    items: NavItem[];
    changelogItem: NavItem;
    isItemActive: (item: NavItem) => boolean;
} {
    const { can } = usePage().props.auth;
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const productionPage = productionIndex;

    const items: NavItem[] = [
        ...(can.manageOperations ? operationNavItems.slice(0, 1) : []),
        ...(can.viewTechnicalSheets
            ? [
                  {
                      title: 'Fichas técnicas',
                      href: technicalSheetsIndex(),
                      icon: ClipboardTextIcon,
                  },
              ]
            : []),
        ...(can.viewMaterials
            ? [{ title: 'Insumos', href: materialsIndex(), icon: ScissorsIcon }]
            : []),
        ...(can.manageOperations || can.managePhotos
            ? [
                  {
                      title: 'Produtos',
                      href: can.manageOperations
                          ? productsIndex()
                          : productPhotosIndex(),
                      icon: TShirtIcon,
                      items: [
                          ...(can.manageOperations
                              ? [
                                    {
                                        title: 'Listar',
                                        href: productsIndex(),
                                        icon: TShirtIcon,
                                    },
                                    {
                                        title: 'Categorias',
                                        href: categoriesIndex(),
                                        icon: TagIcon,
                                    },
                                ]
                              : []),
                          ...(can.managePhotos
                              ? [
                                    {
                                        title: 'Fotos',
                                        href: productPhotosIndex(),
                                        icon: ImagesIcon,
                                    },
                                ]
                              : []),
                          ...(can.manageOperations
                              ? [
                                    {
                                        title: 'Tipos de lavagem',
                                        href: washTypesIndex(),
                                        icon: DropIcon,
                                    },
                                ]
                              : []),
                      ],
                  },
              ]
            : []),
        ...(can.manageOperations ? operationNavItems.slice(1) : []),
        ...(can.manageProduction
            ? [
                  {
                      title: 'Produção',
                      href: productionIndex(),
                      icon: FactoryIcon,
                      items: [
                          {
                              title: 'Fluxo',
                              href: productionIndex(),
                              icon: FlowArrowIcon,
                              exact: true,
                          },
                          ...(can.createProductionBatch
                              ? [
                                    {
                                        title: 'Novo lote',
                                        href: productionPage({
                                            query: { abrir: 'novo-lote' },
                                        }),
                                        icon: PlusCircleIcon,
                                        exact: true,
                                    },
                                ]
                              : []),
                          ...(can.manageWorkshops
                              ? [
                                    {
                                        title: 'Oficinas',
                                        href: productionPage({
                                            query: { abrir: 'oficinas' },
                                        }),
                                        icon: FactoryIcon,
                                        exact: true,
                                    },
                                ]
                              : []),
                      ],
                  },
              ]
            : []),
        ...(can.manageUsers
            ? [{ title: 'Usuários', href: usersIndex(), icon: UsersIcon }]
            : []),
    ];

    const isItemActive = (item: NavItem): boolean =>
        item.items?.length
            ? item.items.some((child) => isItemActive(child))
            : item.exact
              ? isCurrentUrl(item.href)
              : isCurrentOrParentUrl(item.href);

    return { items, changelogItem, isItemActive };
}
