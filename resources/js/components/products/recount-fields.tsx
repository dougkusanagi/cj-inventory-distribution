import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export type RecountItem = {
    id: number | null;
    size: string;
    is_active: boolean;
    quantity: string;
};

export function recountTotal(items: RecountItem[], total: string): number {
    return items.some((item) => item.is_active && item.quantity !== '')
        ? items.reduce(
              (sum, item) =>
                  sum + (item.is_active ? Number(item.quantity) || 0 : 0),
              0,
          )
        : Number(total);
}

export function RecountFields({
    items,
    total,
    onItems,
    onTotal,
    prefix,
}: {
    items: RecountItem[];
    total: string;
    onItems: (items: RecountItem[]) => void;
    onTotal: (total: string) => void;
    prefix: string;
}) {
    const known = items.some((item) => item.is_active && item.quantity !== '');
    const update = (index: number, change: Partial<RecountItem>) =>
        onItems(
            items.map((item, i) =>
                i === index ? { ...item, ...change } : item,
            ),
        );
    return (
        <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
                Vazio significa quantidade desconhecida; zero significa nenhuma
                peça. Ao preencher quantidades, o total passa a ser a soma dos
                tamanhos contados.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((item, index) => (
                    <div
                        key={item.id ?? `new-${index}`}
                        className="grid gap-3 rounded-xl border p-3"
                    >
                        <div className="flex items-center justify-between gap-2">
                            {item.id === null ? (
                                <Input
                                    aria-label="Novo tamanho"
                                    value={item.size}
                                    maxLength={30}
                                    onChange={(e) =>
                                        update(index, { size: e.target.value })
                                    }
                                />
                            ) : (
                                <span className="font-semibold">
                                    {item.size}
                                </span>
                            )}
                            <Switch
                                aria-label={`Presença do tamanho ${item.size}`}
                                checked={item.is_active}
                                onCheckedChange={(active) =>
                                    update(index, {
                                        is_active: active,
                                        quantity: active ? item.quantity : '',
                                    })
                                }
                            />
                        </div>
                        <Label htmlFor={`${prefix}-${index}`}>
                            Quantidade {item.size}
                        </Label>
                        <Input
                            id={`${prefix}-${index}`}
                            type="number"
                            min={0}
                            max={1000000}
                            inputMode="numeric"
                            placeholder="Desconhecida"
                            disabled={!item.is_active}
                            value={item.quantity}
                            onChange={(e) =>
                                update(index, { quantity: e.target.value })
                            }
                        />
                        {item.id === null && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    onItems(items.filter((_, i) => i !== index))
                                }
                            >
                                <Trash2 />
                                Remover
                            </Button>
                        )}
                    </div>
                ))}
            </div>
            <Button
                type="button"
                variant="outline"
                className="w-fit"
                disabled={items.length >= 50}
                onClick={() =>
                    onItems([
                        ...items,
                        { id: null, size: '', is_active: true, quantity: '' },
                    ])
                }
            >
                <Plus />
                Adicionar tamanho encontrado
            </Button>
            <div className="grid max-w-xs gap-2">
                <Label htmlFor={`${prefix}-total`}>Total contado</Label>
                <Input
                    id={`${prefix}-total`}
                    type="number"
                    min={0}
                    max={50000000}
                    inputMode="numeric"
                    readOnly={known}
                    value={known ? recountTotal(items, total) : total}
                    onChange={(e) => onTotal(e.target.value)}
                />
                {known && (
                    <p className="text-xs text-muted-foreground">
                        Calculado pela soma das quantidades conhecidas.
                    </p>
                )}
            </div>
            <Button
                type="button"
                variant="ghost"
                className="w-fit"
                onClick={() => {
                    onItems(
                        items.map((item) => ({
                            ...item,
                            is_active: false,
                            quantity: '',
                        })),
                    );
                    onTotal('0');
                }}
            >
                Saco não encontrado: marcar zero
            </Button>
        </div>
    );
}
