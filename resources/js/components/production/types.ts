import type { BatchSize } from '@/components/production/size-grid-editor';
import type { Workshop } from '@/components/production/workshop-drawer';

export type Stage = {
    value: string;
    label: string;
    batches: number;
    pieces: number;
    awaiting_batches: number;
    awaiting_pieces: number;
    stalled_batches: number;
};
export type Event = {
    id: number;
    from: string | null;
    to: string;
    actor: string;
    notes: string | null;
    workshop: string | null;
    kind: string | null;
    occurred_at: string;
    sizes_before: BatchSize[] | null;
    sizes_after: BatchSize[] | null;
};
export type Batch = {
    id: number;
    code: string;
    product_id: number;
    product_name: string;
    quantity: number;
    sizes: BatchSize[];
    stage: string;
    version: number;
    stage_entered_at: string;
    stalled: boolean;
    workshop: string | null;
    parent_code: string | null;
    parent_events: Event[];
    awaiting_receipt: boolean;
    notes: string | null;
    can_delete: boolean;
    can_undo: boolean;
    events: Event[];
};
export type Product = {
    id: number;
    name: string;
    code: string;
    model: string | null;
    images: { id: number; url: string; thumb_url: string | null }[];
};
export type ProductionPageProps = {
    stages: Stage[];
    batches: Batch[];
    products: Product[];
    filterProducts: { id: number; name: string }[];
    filters: {
        product: number | null;
        stage: string | null;
        search?: string;
    };
    canCreate: boolean;
    maxQuantity: number;
    stalledAfterDays: number;
    isAdmin: boolean;
    workshops: Workshop[];
};

export const sequence = [
    'planning',
    'cutting',
    'sewing',
    'washing',
    'finishing',
    'completed',
];

export const labels: Record<string, string> = {
    planning: 'Planejamento',
    cutting: 'Corte',
    sewing: 'Costura',
    washing: 'Lavanderia',
    dyeing: 'Tinturaria',
    finishing: 'Acabamento',
    bagging: 'Ensacamento',
    completed: 'Estoque',
};

/** Intervalo da atualização automática do quadro, em milissegundos. */
export const refreshInterval = 30000;

export function nextStage(stage: string): string | undefined {
    return sequence[sequence.indexOf(stage) + 1];
}

export function pluralize(count: number, singular: string, plural: string) {
    return `${count.toLocaleString('pt-BR')} ${count === 1 ? singular : plural}`;
}

export function daysInStage(batch: Batch) {
    return Math.max(
        0,
        Math.floor(
            (Date.now() - new Date(batch.stage_entered_at).getTime()) /
                86400000,
        ),
    );
}

/** Texto da ação principal do lote, ou `null` quando não há ação. */
export function primaryActionLabel(batch: Batch): string | null {
    const next = nextStage(batch.stage);
    if (!next) return null;
    if (batch.awaiting_receipt) return 'Recebi';
    if (next === 'completed') return 'Enviar para o estoque';
    return `Avançar para ${labels[next]}`;
}
