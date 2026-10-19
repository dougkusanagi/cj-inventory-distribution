import { useForm } from '@inertiajs/react';
import {
    ArrowCounterClockwiseIcon,
    DotsThreeIcon,
    MagnifyingGlassIcon,
    MinusCircleIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import store from '@/actions/App/Http/Controllers/ProductStockAdjustmentController';
import InputError from '@/components/input-error';
import {
    RecountFields,
    recountTotal,
} from '@/components/products/recount-fields';
import type { RecountItem } from '@/components/products/recount-fields';
import {
    StockMovementReasonField,
    stockAdjustmentReasons,
} from '@/components/stock-movement-reason-field';
import { StockVolumeSelection } from '@/components/stock-volume-selection';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { idempotencyKey } from '@/lib/idempotency-key';
import type { Product } from '@/types';

type VolumeCorrection = {
    volume_id: number;
    expected_version: number;
    total_quantity: string;
    items: RecountItem[];
    remove: boolean;
};

export function StockAdjustmentModal({
    product,
    open,
    onOpenChange,
    removeInitially = false,
}: {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    removeInitially?: boolean;
}) {
    const isMobile = useIsMobile();
    const [key] = useState(idempotencyKey);
    const [search, setSearch] = useState('');
    const form = useForm({
        volumes: [] as VolumeCorrection[],
        reason: removeInitially ? 'Correção de cadastro' : '',
        idempotency_key: key,
    });
    const available = product.stock_volumes.filter(
        (volume) => volume.can_recount,
    );
    const unavailableCount = product.stock_volumes.length - available.length;
    const selection = available.map((volume) => ({
        ...volume,
        code: volume.code ?? `Saco ${volume.sort_order + 1}`,
        product,
        sizes: volume.items.filter((item) => item.is_active),
    }));
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const visible = term
        ? selection.filter(
              (volume) =>
                  volume.code.toLocaleLowerCase('pt-BR').includes(term) ||
                  volume.sizes.some((item) =>
                      item.size.toLocaleLowerCase('pt-BR').includes(term),
                  ),
          )
        : selection;
    const selectedIds = form.data.volumes.map((volume) => volume.volume_id);
    const allVisibleSelected =
        visible.length > 0 &&
        visible.every((volume) => selectedIds.includes(volume.id));
    const correctionFor = (id: number): VolumeCorrection | null => {
        const volume = available.find((candidate) => candidate.id === id);
        if (!volume) return null;
        return {
            volume_id: id,
            expected_version: volume.stock_version ?? 0,
            total_quantity: String(volume.total_quantity),
            items: volume.items.map((item) => ({
                id: item.id,
                size: item.size,
                is_active: item.is_active,
                quantity: item.quantity === null ? '' : String(item.quantity),
            })),
            remove: removeInitially,
        };
    };
    const select = (ids: number[], checked: boolean) => {
        form.clearErrors();
        form.setData(
            'volumes',
            checked
                ? [
                      ...form.data.volumes,
                      ...ids
                          .filter((id) => !selectedIds.includes(id))
                          .map(correctionFor)
                          .filter((volume) => volume !== null),
                  ]
                : form.data.volumes.filter(
                      (volume) => !ids.includes(volume.volume_id),
                  ),
        );
    };
    const update = (id: number, changes: Partial<VolumeCorrection>) => {
        form.clearErrors();
        form.setData(
            'volumes',
            form.data.volumes.map((volume) =>
                volume.volume_id === id ? { ...volume, ...changes } : volume,
            ),
        );
    };
    const quantityOf = (id: number) =>
        available.find((volume) => volume.id === id)?.total_quantity ?? 0;
    const removed = form.data.volumes.filter((volume) => volume.remove);
    const removedTotal = removed.reduce(
        (sum, volume) => sum + quantityOf(volume.volume_id),
        0,
    );
    const selectedTotal = form.data.volumes.reduce(
        (sum, volume) => sum + quantityOf(volume.volume_id),
        0,
    );
    const missing =
        form.data.volumes.length === 0
            ? removeInitially
                ? 'Marque os sacos que serão excluídos.'
                : 'Marque os sacos que foram recontados.'
            : !form.data.reason.trim()
              ? 'Informe o motivo da correção.'
              : null;
    const otherErrors = Object.entries(form.errors).filter(
        ([field]) => field !== 'reason',
    );

    return (
        <Drawer
            open={open}
            direction={isMobile ? 'bottom' : 'right'}
            onOpenChange={(nextOpen) => {
                if (!form.processing) onOpenChange(nextOpen);
            }}
            dismissible={!form.processing}
        >
            <DrawerContent
                side={isMobile ? 'bottom' : 'right'}
                className="max-h-[95dvh] sm:max-w-2xl"
                data-testid={
                    removeInitially
                        ? 'stock-removal-drawer'
                        : 'stock-adjustment-drawer'
                }
            >
                <DrawerHeader>
                    <DrawerTitle>
                        {removeInitially
                            ? 'Excluir sacos'
                            : 'Corrigir contagem'}
                    </DrawerTitle>
                    <DrawerDescription>
                        {removeInitially
                            ? `Marque os sacos de ${product.name} cadastrados por engano. Eles saem do estoque e a correção fica no histórico.`
                            : `Marque os sacos recontados de ${product.name} e informe as quantidades encontradas. A correção fica no histórico.`}
                    </DrawerDescription>
                </DrawerHeader>
                <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-6 pb-5">
                    {available.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                            {removeInitially
                                ? 'Não há sacos disponíveis para excluir.'
                                : 'Não há sacos disponíveis para corrigir.'}{' '}
                            Sacos reservados ou já retirados ficam bloqueados.
                        </div>
                    ) : (
                        <>
                            <StockMovementReasonField
                                id="recount-reason"
                                value={form.data.reason}
                                options={stockAdjustmentReasons}
                                onChange={(reason) =>
                                    form.setData('reason', reason)
                                }
                                error={form.errors.reason}
                            />
                            <section
                                className="grid gap-3"
                                aria-labelledby="adjustment-volumes-title"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="grid gap-0.5">
                                        <h3
                                            id="adjustment-volumes-title"
                                            className="text-sm font-medium"
                                        >
                                            Sacos disponíveis (
                                            {available.length})
                                        </h3>
                                        {unavailableCount > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                {unavailableCount}{' '}
                                                {unavailableCount === 1
                                                    ? 'saco reservado ou retirado não aparece'
                                                    : 'sacos reservados ou retirados não aparecem'}{' '}
                                                aqui.
                                            </p>
                                        )}
                                    </div>
                                    {visible.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={form.processing}
                                            onClick={() =>
                                                select(
                                                    visible.map(
                                                        (volume) => volume.id,
                                                    ),
                                                    !allVisibleSelected,
                                                )
                                            }
                                        >
                                            {allVisibleSelected
                                                ? 'Limpar seleção'
                                                : term
                                                  ? `Selecionar ${visible.length} encontrados`
                                                  : 'Selecionar todos'}
                                        </Button>
                                    )}
                                </div>
                                {!removeInitially && (
                                    <p className="text-xs text-muted-foreground">
                                        Quantidade vazia significa desconhecida;
                                        zero significa nenhuma peça.
                                    </p>
                                )}
                                {available.length > 6 && (
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Buscar código do saco ou tamanho"
                                            aria-label="Buscar saco"
                                            className="pl-10"
                                        />
                                    </div>
                                )}
                                <StockVolumeSelection
                                    volumes={visible}
                                    showProduct={false}
                                    selectedIds={selectedIds}
                                    disabled={form.processing}
                                    onToggle={(id, checked) =>
                                        select([id], checked)
                                    }
                                    renderDetails={
                                        removeInitially
                                            ? undefined
                                            : (volume) => {
                                                  const correction =
                                                      form.data.volumes.find(
                                                          (candidate) =>
                                                              candidate.volume_id ===
                                                              volume.id,
                                                      );

                                                  return correction ? (
                                                      <CorrectionDetails
                                                          code={volume.code}
                                                          registered={
                                                              volume.total_quantity
                                                          }
                                                          correction={
                                                              correction
                                                          }
                                                          disabled={
                                                              form.processing
                                                          }
                                                          onChange={(changes) =>
                                                              update(
                                                                  volume.id,
                                                                  changes,
                                                              )
                                                          }
                                                      />
                                                  ) : null;
                                              }
                                    }
                                />
                                {visible.length === 0 && (
                                    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        Nenhum saco encontrado para “{search}”.
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSearch('')}
                                        >
                                            Limpar busca
                                        </Button>
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </div>
                {available.length > 0 ? (
                    <DrawerFooter className="shrink-0 gap-3 border-t pt-4">
                        <div className="grid gap-1" aria-live="polite">
                            {!(removeInitially && removed.length > 0) && (
                                <p className="text-sm font-medium">
                                    {form.data.volumes.length}{' '}
                                    {form.data.volumes.length === 1
                                        ? 'saco selecionado'
                                        : 'sacos selecionados'}
                                    {form.data.volumes.length > 0 &&
                                        ` · ${selectedTotal} peças`}
                                </p>
                            )}
                            {removed.length > 0 && (
                                <p className="text-sm text-destructive">
                                    {removed.length}{' '}
                                    {removed.length === 1 ? 'saco' : 'sacos'} ·{' '}
                                    {removedTotal} peças serão removidas do
                                    estoque.
                                </p>
                            )}
                            {missing && (
                                <p className="text-xs text-muted-foreground">
                                    {missing}
                                </p>
                            )}
                            <div role="alert">
                                {otherErrors.map(([field, message]) => (
                                    <InputError key={field} message={message} />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 sm:h-9"
                                disabled={form.processing}
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant={
                                    removeInitially ? 'destructive' : 'default'
                                }
                                className="h-11 sm:h-9"
                                disabled={form.processing || missing !== null}
                                onClick={() =>
                                    form.post(store.url(product.id), {
                                        preserveScroll: true,
                                        onSuccess: () => onOpenChange(false),
                                    })
                                }
                            >
                                {form.processing
                                    ? 'Registrando...'
                                    : removeInitially
                                      ? 'Confirmar remoção'
                                      : 'Confirmar correções'}
                            </Button>
                        </div>
                    </DrawerFooter>
                ) : (
                    <DrawerFooter className="shrink-0 border-t pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 sm:h-9"
                            onClick={() => onOpenChange(false)}
                        >
                            Fechar
                        </Button>
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
}

function CorrectionDetails({
    code,
    registered,
    correction,
    disabled,
    onChange,
}: {
    code: string;
    registered: number;
    correction: VolumeCorrection;
    disabled: boolean;
    onChange: (changes: Partial<VolumeCorrection>) => void;
}) {
    return (
        <section
            className="ml-4 grid gap-4 border-l-2 border-highlight/60 py-1 pl-4"
            aria-label={`Correção ${code}`}
        >
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                    {correction.remove ? (
                        <span className="text-destructive">
                            Será removido como cadastro incorreto.
                        </span>
                    ) : (
                        <>
                            Registrado: {registered} · Contado:{' '}
                            {recountTotal(
                                correction.items,
                                correction.total_quantity,
                            )}{' '}
                            peças
                        </>
                    )}
                </p>
                {correction.remove ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onChange({ remove: false })}
                    >
                        <ArrowCounterClockwiseIcon weight="bold" />
                        Desfazer
                    </Button>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={disabled}
                                aria-label={`Ações ${code}`}
                            >
                                <DotsThreeIcon weight="bold" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => onChange({ remove: true })}
                            >
                                <MinusCircleIcon />
                                Remover cadastro incorreto
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            {!correction.remove && (
                <fieldset disabled={disabled} className="grid min-w-0 gap-4">
                    <RecountFields
                        items={correction.items}
                        total={correction.total_quantity}
                        onItems={(items) => onChange({ items })}
                        onTotal={(total_quantity) =>
                            onChange({ total_quantity })
                        }
                        prefix={`recount-${correction.volume_id}`}
                        showHint={false}
                    />
                </fieldset>
            )}
        </section>
    );
}
