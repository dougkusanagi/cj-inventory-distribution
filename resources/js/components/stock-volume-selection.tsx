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
                className="grid cursor-pointer gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/30 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 data-[selected=true]:border-highlight data-[selected=true]:bg-primary/5"
            >
                <span className="flex items-start gap-3">
                    <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) =>
                            onToggle(volume.id, checked === true)
                        }
                        disabled={disabled}
                        aria-label={`Selecionar ${volume.code}`}
                        className="mt-0.5 size-5"
                    />
                    <span className="grid min-w-0 flex-1 gap-1">
                        <span className="font-mono text-sm leading-6 font-semibold tracking-tight">
                            {volume.code}
                        </span>
                        {showProduct && (
                            <strong className="text-sm leading-tight font-medium">
                                {volume.product.name}
                            </strong>
                        )}
                        {showProduct && reference && (
                            <span className="truncate font-mono text-xs text-muted-foreground">
                                {reference}
                            </span>
                        )}
                    </span>
                    <span className="grid shrink-0 justify-items-end text-right tabular-nums">
                        <span className="text-2xl leading-none font-semibold">
                            {volume.total_quantity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {volume.total_quantity === 1 ? 'peça' : 'peças'}
                        </span>
                    </span>
                </span>
                <span className="border-t pt-3">
                    <StockSizeBreakdown sizes={volume.sizes} />
                </span>
            </label>
        );
    });
}
