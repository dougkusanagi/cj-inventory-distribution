import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { flushSync, createPortal } from 'react-dom';
import { formatMoney } from '@/components/ui/amount-inputs';
import { Button } from '@/components/ui/button';
import type {
    CostLine,
    CostSummary,
    MaterialLine,
    Sheet,
    SheetProduct,
} from './data';
import { materialRoleLabels, statusLabels } from './data';

type PrintMaterial = Pick<
    MaterialLine,
    'material_name' | 'role' | 'quantity' | 'unit'
> & { id?: number };
type PrintCosts = {
    items: CostLine[];
    sales: { name: string; price: string }[];
    summary?: CostSummary;
};

export function PrintSheet({
    product,
    sheet,
    materials,
    costs,
    dirty,
    blank,
}: {
    product: SheetProduct;
    sheet: Sheet;
    materials: PrintMaterial[];
    costs?: PrintCosts;
    dirty?: boolean;
    blank?: boolean;
}) {
    const { locale } = usePage().props;
    const [printing, setPrinting] = useState(false);
    const quantity = new Intl.NumberFormat(locale, {
        maximumFractionDigits: 3,
    });
    const percent = new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: 2,
    });
    const money = (value: string | null, precision = 2) =>
        value ? formatMoney(value, locale, precision) : '—';
    const title = blank
        ? 'Ficha técnica em branco'
        : costs
          ? 'Ficha de custos'
          : 'Ficha técnica';

    function print() {
        flushSync(() => setPrinting(true));
        const bodyStyle = document.body.style;
        const position = bodyStyle.getPropertyValue('position');
        const priority = bodyStyle.getPropertyPriority('position');

        // Vaul fixes the body on Safari while the editor is open.
        if (position === 'fixed') {
            bodyStyle.removeProperty('position');
        }

        window.addEventListener(
            'afterprint',
            () => {
                if (position === 'fixed') {
                    bodyStyle.setProperty('position', position, priority);
                }
                setPrinting(false);
            },
            { once: true },
        );
        window.print();
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={print}
            >
                {blank
                    ? 'Imprimir ficha em branco'
                    : costs
                      ? 'Imprimir custos'
                      : 'Imprimir ficha técnica'}
            </Button>
            {printing &&
                createPortal(
                    <article className="technical-sheet-print">
                        <h1>{title}</h1>
                        {blank ? (
                            <p className="technical-sheet-writing-line">
                                Produto / código
                            </p>
                        ) : (
                            <>
                                <h2>{product.name}</h2>
                                <p>
                                    {product.code}
                                    {product.model &&
                                        ` · Mod. ${product.model}`}{' '}
                                    · Revisão {sheet.revision} ·{' '}
                                    {statusLabels[sheet.status]}
                                </p>
                                {dirty && (
                                    <p>
                                        <strong>Alterações não salvas</strong>
                                    </p>
                                )}
                            </>
                        )}
                        <p
                            className={
                                blank
                                    ? 'technical-sheet-writing-line'
                                    : undefined
                            }
                        >
                            <strong>Lavagem</strong>
                            {!blank &&
                                ` · ${product.wash_type ?? 'Não informada'}`}
                        </p>
                        <h2>Instruções</h2>
                        {blank ? (
                            Array.from({ length: 4 }, (_, index) => (
                                <p
                                    className="technical-sheet-writing-line"
                                    key={index}
                                />
                            ))
                        ) : (
                            <p className="whitespace-pre-wrap">
                                {sheet.instructions ||
                                    'Nenhuma instrução registrada.'}
                            </p>
                        )}
                        <h2>Insumos por peça</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Insumo</th>
                                    <th>Uso</th>
                                    <th>Consumo</th>
                                    <th>Unidade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {blank
                                    ? Array.from({ length: 8 }, (_, index) => (
                                          <tr key={index}>
                                              <td />
                                              <td />
                                              <td />
                                              <td />
                                          </tr>
                                      ))
                                    : materials.map((line, index) => (
                                          <tr key={index}>
                                              <td>{line.material_name}</td>
                                              <td>
                                                  {
                                                      materialRoleLabels[
                                                          line.role
                                                      ]
                                                  }
                                              </td>
                                              <td>
                                                  {line.quantity
                                                      ? quantity.format(
                                                            Number(
                                                                line.quantity,
                                                            ),
                                                        )
                                                      : '—'}
                                              </td>
                                              <td>{line.unit}</td>
                                          </tr>
                                      ))}
                            </tbody>
                        </table>
                        {costs && (
                            <>
                                <h2>Custos-base</h2>
                                {costs.items.map((item) => (
                                    <p key={item.cost_item_id}>
                                        {item.cost_name} · {money(item.amount)}
                                        {item.surcharge_value &&
                                            ` + ${item.surcharge_type === 'fixed' ? money(item.surcharge_value) : percent.format(Number(item.surcharge_value) / 100)}`}
                                    </p>
                                ))}
                                {costs.summary ? (
                                    <>
                                        <p>
                                            <strong>Custo comum</strong> ·{' '}
                                            {money(costs.summary.baseTotal)}
                                        </p>
                                        {costs.summary.lines.map((line) => (
                                            <section key={line.id}>
                                                <h2>
                                                    {
                                                        materials.find(
                                                            (item) =>
                                                                item.id ===
                                                                line.id,
                                                        )?.material_name
                                                    }
                                                </h2>
                                                <p>
                                                    Preço unitário ·{' '}
                                                    {money(line.unit_price, 4)}{' '}
                                                    | Custo do insumo ·{' '}
                                                    {money(line.material_cost)}
                                                </p>
                                                <p>
                                                    Custo total ·{' '}
                                                    {money(line.total)} | Venda
                                                    · {money(line.sale_price)} |
                                                    Lucro · {money(line.profit)}
                                                </p>
                                                <p>
                                                    Margem ·{' '}
                                                    {line.margin === null
                                                        ? '—'
                                                        : percent.format(
                                                              Number(
                                                                  line.margin,
                                                              ) / 100,
                                                          )}
                                                </p>
                                            </section>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <h2>Preços de venda</h2>
                                        {costs.sales.map((sale) => (
                                            <p key={sale.name}>
                                                {sale.name} ·{' '}
                                                {money(sale.price)}
                                            </p>
                                        ))}
                                        <p>
                                            Salve os custos para calcular os
                                            totais.
                                        </p>
                                    </>
                                )}
                            </>
                        )}
                    </article>,
                    document.body,
                )}
        </>
    );
}
