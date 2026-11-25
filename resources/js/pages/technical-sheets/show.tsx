import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import ImageCarousel from '@/components/image-carousel';
import InputError from '@/components/input-error';
import { formatMoney } from '@/components/ui/amount-inputs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    index,
    product as productRoute,
    transition,
} from '@/routes/technical-sheets';
import { CostEditor } from './cost-editor';
import type {
    Costs,
    MaterialLine,
    MaterialOption,
    Sheet,
    SheetProduct,
    Status,
} from './data';
import { materialRoleLabels, statusLabels } from './data';
import { PrintSheet } from './print-sheet';
import { RevisionDrawer } from './revision-drawer';
import { TechnicalEditor } from './technical-editor';

const actions = {
    draft: {
        label: 'Devolver ao rascunho',
        description: 'Explique o que deve ser corrigido na ficha.',
    },
    in_review: {
        label: 'Enviar para revisão',
        description:
            'O Administrador poderá conferir os custos e aprovar a ficha.',
    },
    approved: {
        label: 'Aprovar revisão',
        description:
            'A ficha guardará os preços vigentes. A aprovação substitui a revisão aprovada anterior.',
    },
    obsolete: {
        label: 'Marcar como obsoleta',
        description: 'A revisão ficará disponível no histórico e sairá de uso.',
    },
} satisfies Record<Status, { label: string; description: string }>;

function TransitionForm({
    target,
    sheet,
    onClose,
}: {
    target: Status;
    sheet: Sheet;
    onClose: () => void;
}) {
    const action = actions[target];
    const form = useForm({
        version: sheet.version,
        status: target,
        reason: '',
    });

    return (
        <RevisionDrawer
            title={action.label}
            description={action.description}
            submitLabel={action.label}
            processing={form.processing}
            error={form.errors.version ?? form.errors.status}
            onClose={onClose}
            onSubmit={(event) => {
                event.preventDefault();
                form.submit(transition(sheet.id), {
                    preserveScroll: true,
                    onSuccess: onClose,
                });
            }}
        >
            {target === 'draft' && (
                <div className="grid gap-2">
                    <Label htmlFor="return-reason">Motivo da devolução</Label>
                    <Textarea
                        id="return-reason"
                        required
                        maxLength={1000}
                        value={form.data.reason}
                        onChange={(event) =>
                            form.setData('reason', event.target.value)
                        }
                    />
                    <InputError message={form.errors.reason} />
                </div>
            )}
        </RevisionDrawer>
    );
}

export default function ShowTechnicalSheet({
    product,
    sheet,
    materials,
    materialOptions,
    costs,
}: {
    product: SheetProduct;
    sheet: Sheet;
    materials: MaterialLine[];
    materialOptions?: MaterialOption[];
    costs?: Costs;
}) {
    const [editor, setEditor] = useState<'technical' | 'costs' | Status | null>(
        null,
    );
    const trigger = useRef<HTMLButtonElement | null>(null);
    const { locale } = usePage().props;
    const quantity = new Intl.NumberFormat(locale, {
        maximumFractionDigits: 3,
    });
    const percentage = new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: 2,
    });
    const open = (
        target: NonNullable<typeof editor>,
        button: HTMLButtonElement,
    ) => {
        trigger.current = button;
        setEditor(target);
    };
    const close = () => {
        setEditor(null);
        requestAnimationFrame(
            () => trigger.current?.isConnected && trigger.current.focus(),
        );
    };
    const availableActions: Status[] = [];
    if (!product.archived) {
        if (sheet.status === 'draft') availableActions.push('in_review');
        if (sheet.status === 'in_review' && costs)
            availableActions.push('draft', 'approved');
        if (sheet.status === 'approved' && costs)
            availableActions.push('obsolete');
    }

    return (
        <>
            <Head title={`Ficha técnica de ${product.name}`} />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">
                            {product.code}
                            {product.model && ` · Mod. ${product.model}`}
                        </p>
                        <h1 className="text-3xl font-semibold break-words">
                            {product.name}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span>Revisão {sheet.revision}</span>
                            <Badge variant="secondary">
                                {statusLabels[sheet.status]}
                            </Badge>
                        </div>
                    </div>
                    <Button asChild variant="outline" className="h-11">
                        <Link
                            href={
                                product.archived
                                    ? index()
                                    : productRoute(product.id)
                            }
                        >
                            Voltar às revisões
                        </Link>
                    </Button>
                </header>
                <div className="flex flex-wrap gap-2">
                    <PrintSheet
                        product={product}
                        sheet={sheet}
                        materials={materials}
                    />
                    {costs && (
                        <PrintSheet
                            product={product}
                            sheet={sheet}
                            materials={materials}
                            costs={{
                                items: costs.items,
                                summary: costs.summary,
                                sales: [],
                            }}
                        />
                    )}
                    <PrintSheet
                        product={product}
                        sheet={sheet}
                        materials={[]}
                        blank
                    />
                </div>
                {sheet.review_note && (
                    <Card className="gap-2 p-4">
                        <h2 className="font-semibold">Última devolução</h2>
                        <p className="text-sm break-words whitespace-pre-wrap">
                            {sheet.review_note}
                        </p>
                    </Card>
                )}
                <Card className="grid gap-4 p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-xl font-semibold">
                            Dados técnicos
                        </h2>
                        {materialOptions && (
                            <Button
                                variant="outline"
                                className="h-11"
                                onClick={(event) =>
                                    open('technical', event.currentTarget)
                                }
                            >
                                Editar dados técnicos
                            </Button>
                        )}
                    </div>
                    <div
                        className={
                            product.images.length > 0
                                ? 'grid gap-4 sm:grid-cols-[12rem_1fr]'
                                : 'grid gap-4'
                        }
                    >
                        {product.images.length > 0 && (
                            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                                <ImageCarousel
                                    images={product.images.map(
                                        (image) => image.url,
                                    )}
                                    alt={product.name}
                                />
                            </div>
                        )}
                        <div className="min-w-0 space-y-3">
                            <p className="text-sm">
                                <strong>Lavagem</strong> ·{' '}
                                {product.wash_type ?? 'Não informada'}
                            </p>
                            <h3 className="font-semibold">Instruções</h3>
                            <p className="text-sm break-words whitespace-pre-wrap">
                                {sheet.instructions ||
                                    'Nenhuma instrução registrada.'}
                            </p>
                        </div>
                    </div>
                    <h3 className="font-semibold">Insumos por peça</h3>
                    {materials.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Ainda não há insumos nesta revisão.
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {materials.map((item) => (
                                <li
                                    className="grid gap-1 py-2 text-sm sm:grid-cols-[1fr_auto]"
                                    key={item.id}
                                >
                                    <span className="min-w-0 break-words">
                                        {item.material_name}{' '}
                                        <span className="text-muted-foreground">
                                            · {materialRoleLabels[item.role]}
                                        </span>
                                    </span>
                                    <span>
                                        {quantity.format(Number(item.quantity))}{' '}
                                        · {item.unit}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                {costs && (
                    <Card className="grid gap-3 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-xl font-semibold">Custos</h2>
                            {!product.archived &&
                                (sheet.status === 'draft' ||
                                    sheet.status === 'in_review') && (
                                    <Button
                                        variant="outline"
                                        className="h-11"
                                        onClick={(event) =>
                                            open('costs', event.currentTarget)
                                        }
                                    >
                                        Editar custos
                                    </Button>
                                )}
                        </div>
                        <p className="text-sm">
                            Custo comum:{' '}
                            {costs.summary.baseTotal === null
                                ? 'Faltam preços vigentes'
                                : formatMoney(costs.summary.baseTotal, locale)}
                        </p>
                        {costs.items.map((item) => (
                            <p
                                className="text-sm break-words"
                                key={item.cost_item_id}
                            >
                                {item.cost_name} ·{' '}
                                {formatMoney(item.amount, locale)}
                                {item.surcharge_value !== null &&
                                    ` + ${item.surcharge_type === 'fixed' ? formatMoney(item.surcharge_value, locale) : percentage.format(Number(item.surcharge_value) / 100)}`}
                            </p>
                        ))}
                        <ul className="grid gap-2">
                            {costs.summary.lines.map((line) => (
                                <li
                                    className="rounded-lg border p-3 text-sm"
                                    key={line.id}
                                >
                                    <strong className="block break-words">
                                        {
                                            materials.find(
                                                (item) => item.id === line.id,
                                            )?.material_name
                                        }
                                    </strong>
                                    <span>
                                        {line.material_cost === null
                                            ? 'Sem preço vigente'
                                            : `Custo do insumo: ${formatMoney(line.material_cost, locale)}`}
                                    </span>
                                    {line.total !== null && (
                                        <span className="block">
                                            Custo total:{' '}
                                            {formatMoney(line.total, locale)}
                                        </span>
                                    )}
                                    {line.sale_price !== null && (
                                        <span className="block">
                                            Venda:{' '}
                                            {formatMoney(
                                                line.sale_price,
                                                locale,
                                            )}
                                        </span>
                                    )}
                                    {line.profit !== null && (
                                        <span className="block">
                                            Lucro:{' '}
                                            {formatMoney(line.profit, locale)}
                                        </span>
                                    )}
                                    {line.margin !== null && (
                                        <span className="block">
                                            Margem:{' '}
                                            {percentage.format(
                                                Number(line.margin) / 100,
                                            )}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
                <div className="flex flex-wrap gap-2">
                    {availableActions.map((action) => (
                        <Button
                            key={action}
                            variant={
                                action === 'obsolete' || action === 'draft'
                                    ? 'outline'
                                    : 'default'
                            }
                            className="h-11"
                            onClick={(event) =>
                                open(action, event.currentTarget)
                            }
                        >
                            {actions[action].label}
                        </Button>
                    ))}
                </div>
            </div>
            {editor === 'technical' && materialOptions && (
                <TechnicalEditor
                    product={product}
                    sheet={sheet}
                    materials={materials}
                    options={materialOptions}
                    onClose={close}
                />
            )}
            {editor === 'costs' && costs && (
                <CostEditor
                    product={product}
                    sheet={sheet}
                    materials={materials}
                    costs={costs}
                    onClose={close}
                />
            )}
            {editor && editor !== 'technical' && editor !== 'costs' && (
                <TransitionForm target={editor} sheet={sheet} onClose={close} />
            )}
        </>
    );
}
