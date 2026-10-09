import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { Checkbox } from '@/components/ui/checkbox';
import type { StockExitVolume } from '@/types';

export function StockVolumeSelection({
    volumes,
    selectedIds,
    onToggle,
    disabled = false,
    showProduct = true,
}: {
    volumes: StockExitVolume[];
    selectedIds: number[];
    onToggle: (id: number, checked: boolean) => void;
    disabled?: boolean;
    showProduct?: boolean;
}) {
    return volumes.map((volume) => {
        const selected = selectedIds.includes(volume.id);
        const reference = [volume.product.code, volume.product.model]
            .filter(Boolean)
            .join(' · ');

        return (
            <label
                key={volume.id}
                data-selected={selected}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-3.5 transition-colors hover:bg-muted/30 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 data-[selected=true]:border-highlight data-[selected=true]:bg-primary/5"
            >
                <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) =>
                        onToggle(volume.id, checked === true)
                    }
                    disabled={disabled}
                    aria-label={`Selecionar ${volume.code}`}
                    className="mt-0.5 size-5"
                />
                <span className="grid min-w-0 flex-1 gap-2.5">
                    <span className="flex items-baseline justify-between gap-3">
                        <span className="grid min-w-0 gap-0.5">
                            <span className="font-mono text-sm leading-5 font-semibold">
                                {volume.code}
                            </span>
                            {showProduct && (
                                <span className="truncate text-xs text-muted-foreground">
                                    {[volume.product.name, reference]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            )}
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                            <strong className="text-base font-semibold text-foreground">
                                {volume.total_quantity}
                            </strong>{' '}
                            {volume.total_quantity === 1 ? 'peça' : 'peças'}
                        </span>
                    </span>
                    <StockSizeBreakdown sizes={volume.sizes} compact />
                </span>
            </label>
        );
    });
}
