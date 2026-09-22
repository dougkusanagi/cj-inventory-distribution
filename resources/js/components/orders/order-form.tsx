import { Link, useForm, type InertiaLinkProps } from '@inertiajs/react';
import { Save, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { store, update } from '@/actions/App/Http/Controllers/OrderController';
import { PaperBag } from '@/components/icons/paper-bag';
import InputError from '@/components/input-error';
import { StockSizeBreakdown } from '@/components/stock-size-breakdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AvailableOrderVolume, Order } from '@/types';

export function OrderForm({
    order,
    availableVolumes = [],
    cancelHref,
}: {
    order?: Order;
    availableVolumes?: AvailableOrderVolume[];
    cancelHref?: InertiaLinkProps['href'];
}) {
    const form = useForm({
        store_name: order?.store_name ?? '',
        requester_name: order?.requester_name ?? '',
        whatsapp: order?.whatsapp ?? '',
        notes: order?.notes ?? '',
        volume_ids: [] as number[],
        ...(order ? { _method: 'PUT' as const } : {}),
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(order ? update.url(order.id) : store.url());
    };

    const toggleVolume = (id: number, checked: boolean) => {
        form.setData(
            'volume_ids',
            checked
                ? [...form.data.volume_ids, id]
                : form.data.volume_ids.filter((volumeId) => volumeId !== id),
        );
    };

    return (
        <form onSubmit={submit} className="grid gap-6">
            <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                <CardHeader>
                    <CardTitle>Identificação do pedido</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="store-name">Loja</Label>
                        <Input
                            id="store-name"
                            value={form.data.store_name}
                            onChange={(event) =>
                                form.setData('store_name', event.target.value)
                            }
                            aria-invalid={
                                form.errors.store_name ? true : undefined
                            }
                            placeholder="Nome da loja"
                        />
                        <InputError message={form.errors.store_name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="requester-name">Responsável</Label>
                        <Input
                            id="requester-name"
                            value={form.data.requester_name}
                            onChange={(event) =>
                                form.setData(
                                    'requester_name',
                                    event.target.value,
                                )
                            }
                            aria-invalid={
                                form.errors.requester_name ? true : undefined
                            }
                            placeholder="Nome de quem solicitou"
                        />
                        <InputError message={form.errors.requester_name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                        <Input
                            id="whatsapp"
                            value={form.data.whatsapp}
                            onChange={(event) =>
                                form.setData('whatsapp', event.target.value)
                            }
                            placeholder="Ex.: 55 11 99999-9999"
                        />
                        <InputError message={form.errors.whatsapp} />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="order-notes">
                            Observações (opcional)
                        </Label>
                        <Textarea
                            id="order-notes"
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                        />
                        <InputError message={form.errors.notes} />
                    </div>
                </CardContent>
            </Card>

            {order && (
                <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                    <CardHeader>
                        <CardTitle>Sacos reservados</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {(order.items ?? []).map((item) => (
                            <article
                                key={item.id}
                                className="flex items-start gap-3 rounded-2xl border border-border p-4"
                            >
                                <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.product_name}
                                            loading="lazy"
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
                                            Sem foto
                                        </div>
                                    )}
                                </div>
                                <div className="grid min-w-0 gap-2">
                                    <div>
                                        <p className="font-semibold">
                                            {item.product_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {item.product_code} ·{' '}
                                            {item.volume_code} ·{' '}
                                            {item.total_quantity} peças
                                        </p>
                                    </div>
                                    <StockSizeBreakdown sizes={item.sizes} />
                                </div>
                            </article>
                        ))}
                    </CardContent>
                </Card>
            )}

            {!order && (
                <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                    <CardHeader>
                        <CardTitle>Selecionar sacos</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {availableVolumes.map((volume) => {
                            const selected = form.data.volume_ids.includes(
                                volume.id,
                            );

                            return (
                                <label
                                    key={volume.id}
                                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 hover:bg-muted/30"
                                >
                                    <Checkbox
                                        checked={selected}
                                        onCheckedChange={(checked) =>
                                            toggleVolume(
                                                volume.id,
                                                checked === true,
                                            )
                                        }
                                        aria-label={`Selecionar ${volume.code}`}
                                    />
                                    <span className="grid min-w-0 flex-1 gap-2">
                                        <span className="flex flex-wrap items-center justify-between gap-2">
                                            <strong>
                                                {volume.product.name}
                                            </strong>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {volume.code}
                                            </span>
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {volume.product.code}
                                            {volume.product.model
                                                ? ` · Modelo ${volume.product.model}`
                                                : ''}{' '}
                                            · {volume.total_quantity} peças
                                        </span>
                                        <span className="flex flex-wrap gap-1.5">
                                            {volume.sizes.map((size) => (
                                                <span
                                                    key={size.size}
                                                    className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                                                >
                                                    {size.size}
                                                    {size.quantity !== null
                                                        ? `: ${size.quantity}`
                                                        : ''}
                                                </span>
                                            ))}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}
                        {availableVolumes.length === 0 && (
                            <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                                <PaperBag className="size-7" />
                                <p>
                                    Não há sacos disponíveis para um novo
                                    pedido.
                                </p>
                            </div>
                        )}
                        <InputError message={form.errors.volume_ids} />
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {cancelHref && (
                    <Button
                        type="button"
                        variant="outline"
                        className="h-11"
                        asChild
                    >
                        <Link href={cancelHref} data-testid="cancelar-edicao">
                            <X />
                            Cancelar
                        </Link>
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={
                        form.processing ||
                        (!order && availableVolumes.length === 0)
                    }
                    className="h-11"
                >
                    <Save />
                    {form.processing
                        ? 'Salvando...'
                        : order
                          ? 'Salvar alterações'
                          : 'Registrar pedido'}
                </Button>
            </div>
        </form>
    );
}
