import type { InertiaLinkProps } from '@inertiajs/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: PhosphorIcon | null;
    isActive?: boolean;
    exact?: boolean;
    disabled?: boolean;
    items?: NavItem[];
};
