import type { ReactNode } from 'react';
import type { ExternalToast } from 'sonner';
import type { BreadcrumbItem } from '@/types/navigation';

export type AppLayoutProps = {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
};

export type AppVariant = 'header' | 'sidebar';

export type FlashToast = {
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
    position?: ExternalToast['position'];
    /** Ação do aviso, enviada por POST, como "Desfazer". */
    action?: {
        label: string;
        url: string;
        data: Record<string, string | number>;
    } | null;
};

export type AuthLayoutProps = {
    children?: ReactNode;
    name?: string;
    title?: string;
    description?: string;
};
