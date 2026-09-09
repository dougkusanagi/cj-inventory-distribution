import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import type { FormEvent } from 'react';
import {
    store,
    update,
} from '@/actions/App/Http/Controllers/CategoryController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Category } from '@/types';

export function CategoryForm({ category }: { category?: Category }) {
    const form = useForm({
        name: category?.name ?? '',
        is_active: category?.is_active ?? true,
        ...(category ? { _method: 'PUT' as const } : {}),
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(category ? update.url(category.id) : store.url());
    };

    return (
        <form onSubmit={submit} className="grid gap-6">
            <Card className="rounded-[1.75rem] border-border/80 shadow-sm">
                <CardHeader>
                    <CardTitle>Dados da categoria</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="category-name">Nome</Label>
                        <Input
                            id="category-name"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            aria-invalid={form.errors.name ? true : undefined}
                            placeholder="Ex.: Calça"
                            autoFocus
                        />
                        <InputError message={form.errors.name} />
                    </div>

                    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
                        <span className="grid gap-1">
                            <span className="text-sm font-semibold">
                                Categoria ativa
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Categorias inativas não ficam disponíveis para
                                novas atribuições.
                            </span>
                        </span>
                        <Switch
                            checked={form.data.is_active}
                            onCheckedChange={(checked) =>
                                form.setData('is_active', checked)
                            }
                        />
                    </label>
                </CardContent>
            </Card>

            <Button
                type="submit"
                disabled={form.processing}
                className="h-11 justify-self-end"
            >
                <Save />
                {form.processing ? 'Salvando...' : 'Salvar categoria'}
            </Button>
        </form>
    );
}
