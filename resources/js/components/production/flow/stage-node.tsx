import { WarningIcon } from '@phosphor-icons/react';
import {
    Handle,
    Position,
    useStore,
    type Node,
    type NodeProps,
} from '@xyflow/react';
import type { ComponentProps } from 'react';
import { BatchCard } from '@/components/production/batch-card';
import {
    daysInStage,
    pluralize,
    sequence,
    type Batch,
    type Stage,
} from '@/components/production/types';
import { cn } from '@/lib/utils';

/** Largura fixa de cada etapa no fluxo, em pixels do canvas. */
export const STAGE_WIDTH = 340;

/** Abaixo deste zoom, os lotes aparecem compactos, sem botões. */
export const COMPACT_ZOOM = 0.6;

export type FlowOrientation = 'horizontal' | 'vertical';

export type StageNodeData = {
    stage: Stage;
    batches: Batch[];
    orientation: FlowOrientation;
    hasPrevious: boolean;
    hasNext: boolean;
    stalledAfterDays: number;
    completedDays: number;
    /** Lotes destacados pela busca ou pelo modo Atenção; `null` destaca todos. */
    highlighted: Set<number> | null;
    currentId: number | null;
    cardActions: (
        batch: Batch,
    ) => Omit<ComponentProps<typeof BatchCard>, 'batch'>;
    onOpen: (batch: Batch) => void;
};

export type StageNodeType = Node<StageNodeData, 'stage'>;

const handleClass =
    '!size-3 !min-w-0 !rounded-full !border-2 !border-background !bg-[color-mix(in_oklab,var(--foreground)_35%,transparent)]';

export function StageNode({ data }: NodeProps<StageNodeType>) {
    const { stage, batches, orientation, highlighted, currentId } = data;
    const compact = useStore((state) => state.transform[2] < COMPACT_ZOOM);
    const isCompleted = stage.value === 'completed';
    const groups = isCompleted
        ? [
              {
                  title: `Chegaram nos últimos ${data.completedDays} dias`,
                  items: batches,
              },
          ]
        : [
              {
                  title: 'A receber',
                  items: batches.filter((batch) => batch.awaiting_receipt),
              },
              {
                  title: 'No setor',
                  items: batches.filter((batch) => !batch.awaiting_receipt),
              },
          ];
    const position = String(sequence.indexOf(stage.value) + 1).padStart(2, '0');

    return (
        <section
            data-testid="flow-stage"
            data-stage={stage.value}
            aria-label={`${stage.label}: ${pluralize(stage.pieces, 'peça', 'peças')}, ${pluralize(stage.batches, 'lote', 'lotes')}`}
            style={{ width: STAGE_WIDTH }}
            className={cn(
                'cursor-grab rounded-[1.75rem] border border-border/80 bg-[color-mix(in_oklab,var(--card)_88%,transparent)] p-3 shadow-[0_18px_50px_-24px_rgb(0_0_0/0.35)] backdrop-blur-md active:cursor-grabbing',
                stage.awaiting_batches > 0 &&
                    !isCompleted &&
                    'border-[color-mix(in_oklab,var(--action)_55%,var(--border))]',
            )}
        >
            {data.hasPrevious && (
                <Handle
                    type="target"
                    isConnectable={false}
                    position={
                        orientation === 'horizontal'
                            ? Position.Left
                            : Position.Top
                    }
                    className={handleClass}
                />
            )}
            <header className="grid gap-1 px-2 pt-1 pb-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {position}
                        </span>
                        {stage.label}
                    </h2>
                    {stage.awaiting_batches > 0 && !isCompleted && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-highlight tabular-nums">
                            {stage.awaiting_batches} a receber
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    <strong className="text-2xl font-semibold text-foreground tabular-nums">
                        {stage.pieces.toLocaleString('pt-BR')}
                    </strong>{' '}
                    {stage.pieces === 1 ? 'peça' : 'peças'} ·{' '}
                    {pluralize(stage.batches, 'lote', 'lotes')}
                </p>
                {stage.stalled_batches > 0 && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-highlight">
                        <WarningIcon className="size-4 shrink-0" />
                        {stage.stalled_batches === 1
                            ? '1 lote parado'
                            : `${stage.stalled_batches} lotes parados`}{' '}
                        há mais de {data.stalledAfterDays} dias
                    </p>
                )}
            </header>
            <div className="grid gap-3">
                {groups
                    .filter((group) => group.items.length > 0)
                    .map((group) => (
                        <div key={group.title} className="grid gap-2">
                            <p className="flex items-center justify-between gap-2 px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                                <span>{group.title}</span>
                                <span className="normal-case tabular-nums">
                                    {pluralize(
                                        group.items.length,
                                        'lote',
                                        'lotes',
                                    )}
                                </span>
                            </p>
                            <div
                                className={cn(
                                    'grid',
                                    compact ? 'grid-cols-2 gap-2' : 'gap-3',
                                )}
                            >
                                {group.items.map((batch) => (
                                    <div
                                        key={batch.id}
                                        data-flow-batch={batch.id}
                                        className={cn(
                                            'rounded-xl transition-[opacity,box-shadow] duration-300',
                                            highlighted &&
                                                !highlighted.has(batch.id) &&
                                                'opacity-25',
                                            currentId === batch.id &&
                                                'ring-2 ring-[var(--action)] ring-offset-2 ring-offset-card',
                                        )}
                                    >
                                        {compact ? (
                                            <CompactBatch
                                                batch={batch}
                                                onOpen={() =>
                                                    data.onOpen(batch)
                                                }
                                            />
                                        ) : (
                                            <BatchCard
                                                batch={batch}
                                                {...data.cardActions(batch)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                {batches.length === 0 && (
                    <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                        {isCompleted
                            ? `Nenhum lote chegou nos últimos ${data.completedDays} dias.`
                            : 'Nenhum lote nesta etapa.'}
                    </p>
                )}
            </div>
            {data.hasNext && (
                <Handle
                    type="source"
                    isConnectable={false}
                    position={
                        orientation === 'horizontal'
                            ? Position.Right
                            : Position.Bottom
                    }
                    className={handleClass}
                />
            )}
        </section>
    );
}

/** Lote resumido, usado quando o zoom está afastado. */
function CompactBatch({ batch, onOpen }: { batch: Batch; onOpen: () => void }) {
    const days = daysInStage(batch);
    return (
        <button
            type="button"
            data-testid="flow-batch-compact"
            onClick={onOpen}
            aria-label={`Lote ${batch.code}, ${batch.product_name}, ${pluralize(batch.quantity, 'peça', 'peças')}, ${batch.awaiting_receipt ? 'a receber' : 'no setor'}${batch.stalled ? `, parado há ${pluralize(days, 'dia', 'dias')}` : ''}`}
            className={cn(
                'grid w-full gap-1 rounded-xl border-l-4 bg-muted px-3 py-2.5 text-left',
                batch.awaiting_receipt
                    ? 'border-dashed border-[var(--action)]'
                    : batch.stalled
                      ? 'border-highlight'
                      : 'border-border',
            )}
        >
            <span className="font-mono text-xs text-muted-foreground">
                {batch.code}
            </span>
            <span className="flex items-center justify-between gap-2">
                <strong className="text-xl leading-none font-semibold tabular-nums">
                    {batch.quantity.toLocaleString('pt-BR')}
                </strong>
                <span
                    className={cn(
                        'flex items-center gap-1 text-xs tabular-nums',
                        batch.stalled
                            ? 'font-medium text-highlight'
                            : 'text-muted-foreground',
                    )}
                >
                    {batch.stalled && <WarningIcon className="size-4" />}
                    {days}d
                </span>
            </span>
        </button>
    );
}
