import {
    ArrowRightIcon,
    CheckIcon,
    ClockIcon,
    DotsThreeIcon,
    FactoryIcon,
    TShirtIcon,
    WarningIcon,
} from '@phosphor-icons/react';
import {
    daysInStage,
    primaryActionLabel,
    type Batch,
} from '@/components/production/types';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** Botão da ação principal do lote: "Recebi", "Avançar para…" ou "Enviar para o estoque". */
export function PrimaryActionButton({
    batch,
    busy,
    onClick,
    className,
}: {
    batch: Batch;
    busy: number | null;
    onClick: () => void;
    className?: string;
}) {
    const label = primaryActionLabel(batch);
    if (!label) return null;
    return (
        <Button
            variant={batch.awaiting_receipt ? 'default' : 'outline'}
            disabled={busy !== null}
            onClick={onClick}
            className={className}
        >
            {batch.awaiting_receipt ? (
                <CheckIcon weight="bold" />
            ) : (
                <ArrowRightIcon weight="bold" />
            )}
            {busy === batch.id ? 'Aguarde...' : label}
        </Button>
    );
}

export function BatchCard({
    batch,
    isAdmin,
    busy,
    onOpen,
    onPrimary,
    onEditSizes,
    onUndo,
    onDelete,
}: {
    batch: Batch;
    isAdmin: boolean;
    busy: number | null;
    onOpen: () => void;
    onPrimary: () => void;
    onEditSizes: () => void;
    onUndo: () => void;
    onDelete: () => void;
}) {
    const days = daysInStage(batch);
    const canEditSizes = !batch.awaiting_receipt && batch.stage !== 'completed';
    const primary = primaryActionLabel(batch) && (
        <PrimaryActionButton batch={batch} busy={busy} onClick={onPrimary} />
    );

    return (
        <Card
            data-testid="production-batch"
            className={cn(
                '@container min-w-0 gap-3 p-4',
                batch.awaiting_receipt && 'border-dashed',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <button
                    type="button"
                    onClick={onOpen}
                    title={batch.product_name}
                    className="group/title min-w-0 flex-1 rounded-sm text-left"
                >
                    <span className="block font-mono text-[11px] text-muted-foreground">
                        {batch.code}
                    </span>
                    <span className="mt-0.5 line-clamp-2 font-semibold break-words underline-offset-4 group-hover/title:underline">
                        {batch.product_name}
                    </span>
                </button>
                {primary && (
                    <div className="hidden shrink-0 @md:block [&>button]:h-11">
                        {primary}
                    </div>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="-mt-1 -mr-2 shrink-0"
                            aria-label={`Mais ações de ${batch.code}`}
                        >
                            <DotsThreeIcon weight="bold" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onOpen}>
                            Ver detalhes e histórico
                        </DropdownMenuItem>
                        {canEditSizes && (
                            <DropdownMenuItem onSelect={onEditSizes}>
                                Editar grade
                            </DropdownMenuItem>
                        )}
                        {isAdmin && batch.can_undo && (
                            <DropdownMenuItem onSelect={onUndo}>
                                Desfazer último avanço
                            </DropdownMenuItem>
                        )}
                        {isAdmin && batch.can_delete && (
                            <DropdownMenuItem onSelect={onDelete}>
                                Excluir lote
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {primary && (
                <div className="grid @md:hidden [&>button]:h-11">{primary}</div>
            )}
            {batch.workshop && (
                <p
                    className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
                    title={`Oficina: ${batch.workshop}`}
                >
                    <FactoryIcon
                        className="size-4 shrink-0"
                        aria-label="Oficina"
                    />
                    <span className="truncate">{batch.workshop}</span>
                </p>
            )}
            <dl
                className={cn(
                    'grid grid-cols-2 gap-3 rounded-lg px-3 py-2 text-xs',
                    batch.stalled
                        ? 'bg-amber-500/10 text-amber-900 dark:text-amber-100'
                        : 'bg-muted text-muted-foreground',
                )}
            >
                <div className="grid gap-0.5">
                    <dt>Peças</dt>
                    <dd className="flex items-center gap-1.5">
                        <TShirtIcon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            <strong className="text-lg leading-none font-semibold text-foreground tabular-nums">
                                {batch.quantity}
                            </strong>{' '}
                            {batch.quantity === 1 ? 'peça' : 'peças'}
                        </span>
                    </dd>
                </div>
                <div className="grid gap-0.5">
                    <dt
                        className={cn(
                            batch.stalled && 'font-medium text-highlight',
                        )}
                    >
                        {batch.stalled ? 'Parado há' : 'Nesta etapa'}
                    </dt>
                    <dd className="flex items-center gap-1.5">
                        {batch.stalled ? (
                            <WarningIcon
                                className="size-4 shrink-0 text-highlight"
                                aria-hidden="true"
                            />
                        ) : (
                            <ClockIcon
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                        )}
                        <span>
                            <strong className="text-lg leading-none font-semibold text-foreground tabular-nums">
                                {days}
                            </strong>{' '}
                            {days === 1 ? 'dia' : 'dias'}
                        </span>
                    </dd>
                </div>
            </dl>
            {batch.sizes.length > 0 && (
                <StockSizeBreakdown sizes={batch.sizes} compact />
            )}
        </Card>
    );
}
