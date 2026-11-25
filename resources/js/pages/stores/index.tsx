import { Head, router, useForm } from '@inertiajs/react';
import {
    MagnifyingGlassIcon,
    PencilSimpleIcon,
    PlusCircleIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';
import { index, store, update } from '@/routes/stores';
import type { Paginated } from '@/types';

type Store = {
    id: number;
    name: string;
    is_active: boolean;
    shipped_quantity: number;
};

const number = new Intl.NumberFormat(
    typeof document === 'undefined' ? 'pt-BR' : document.documentElement.lang,
);

function StoreEditor({
    selected,
    onClose,
}: {
    selected: Store | null;
    onClose: () => void;
}) {
    const mobile = useIsMobile();
    const side = mobile ? 'bottom' : 'right';
    const form = useForm({
        name: selected?.name ?? '',
        is_active: selected?.is_active ?? true,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };

        if (selected) {
            form.put(update.url(selected.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    return (
        <Drawer
            direction={side}
            open
            dismissible={!form.processing}
            onOpenChange={(open) => {
                if (!open && !form.processing) onClose();
            }}
        >
            <DrawerContent side={side}>
                <DrawerHeader>
                    <DrawerTitle>
                        {selected ? 'Editar loja' : 'Cadastrar loja'}
                    </DrawerTitle>
                    <DrawerDescription>
                        O nome da loja identifica o destino dos pedidos.
                    </DrawerDescription>
                </DrawerHeader>
                <form
                    onSubmit={submit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="grid gap-5 overflow-y-auto px-6 pb-6">
                        <div className="grid gap-2">
                            <Label htmlFor="store-directory-name">
                                Nome da loja
                            </Label>
                            <Input
                                id="store-directory-name"
                                required
                                maxLength={255}
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                aria-invalid={Boolean(form.errors.name)}
                                aria-describedby={
                                    form.errors.name
                                        ? 'store-name-error'
                                        : undefined
                                }
                                disabled={form.processing}
                            />
                            <InputError
                                id="store-name-error"
                                message={form.errors.name}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="store-directory-active">
                                    Loja ativa
                                </Label>
                                <Switch
                                    id="store-directory-active"
                                    checked={form.data.is_active}
                                    onCheckedChange={(value) =>
                                        form.setData('is_active', value)
                                    }
                                    disabled={form.processing}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Lojas inativas continuam no histórico dos
                                pedidos.
                            </p>
                            <InputError message={form.errors.is_active} />
                        </div>
                    </div>
                    <DrawerFooter className="border-t pt-4 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-11"
                            disabled={form.processing}
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="h-11"
                            disabled={form.processing}
                        >
                            {form.processing ? 'Salvando…' : 'Salvar loja'}
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}

export default function StoresIndex({
    stores,
    search,
    unlinkedQuantity,
}: {
    stores: Paginated<Store>;
    search: string;
    unlinkedQuantity: number;
}) {
    const [selected, setSelected] = useState<Store | null | undefined>();
    const trigger = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (selected === undefined) trigger.current?.focus();
    }, [selected]);

    function filter(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const query = new FormData(event.currentTarget).get('search');
        router.get(
            index.url(),
            typeof query === 'string' && query.trim()
                ? { search: query.trim() }
                : {},
        );
    }

    return (
        <>
            <Head title="Lojas" />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Lojas
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Cadastre os destinos e acompanhe as peças de pedidos
                            finalizados.
                        </p>
                    </div>
                    <Button
                        className="h-11"
                        onClick={(event) => {
                            trigger.current = event.currentTarget;
                            setSelected(null);
                        }}
                    >
                        <PlusCircleIcon />
                        Nova loja
                    </Button>
                </header>

                <form
                    onSubmit={filter}
                    className="flex flex-wrap items-end gap-2"
                >
                    <div className="grid min-w-0 flex-1 gap-2 sm:max-w-sm">
                        <Label htmlFor="store-directory-search">
                            Buscar loja
                        </Label>
                        <Input
                            key={search}
                            id="store-directory-search"
                            name="search"
                            defaultValue={search}
                            className="h-11"
                        />
                    </div>
                    <Button type="submit" variant="secondary" className="h-11">
                        <MagnifyingGlassIcon />
                        Buscar
                    </Button>
                    {search && (
                        <Button
                            variant="ghost"
                            className="h-11"
                            onClick={() => router.get(index.url())}
                        >
                            Limpar busca
                        </Button>
                    )}
                </form>

                {unlinkedQuantity > 0 && (
                    <p className="rounded-lg border bg-muted px-4 py-3 text-sm">
                        <strong className="tabular-nums">
                            {number.format(unlinkedQuantity)}
                        </strong>{' '}
                        {unlinkedQuantity === 1
                            ? 'peça em pedido finalizado sem loja vinculada.'
                            : 'peças em pedidos finalizados sem loja vinculada.'}
                    </p>
                )}

                {stores.data.length ? (
                    <ul className="divide-y rounded-xl border bg-card">
                        {stores.data.map((shop) => (
                            <li
                                key={shop.id}
                                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 p-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="min-w-0 font-medium wrap-anywhere">
                                        {shop.name}
                                    </h2>
                                    {!shop.is_active && (
                                        <Badge variant="secondary">
                                            Inativa
                                        </Badge>
                                    )}
                                </div>
                                <p className="col-start-1 row-start-2 text-sm text-muted-foreground sm:col-start-2 sm:row-start-1">
                                    <strong className="font-semibold text-foreground tabular-nums">
                                        {number.format(shop.shipped_quantity)}
                                    </strong>{' '}
                                    {shop.shipped_quantity === 1
                                        ? 'peça em pedido finalizado'
                                        : 'peças em pedidos finalizados'}
                                </p>
                                <Button
                                    variant="outline"
                                    className="col-start-2 row-span-2 row-start-1 h-11 sm:col-start-3 sm:row-span-1"
                                    aria-label={`Editar loja ${shop.name}`}
                                    onClick={(event) => {
                                        trigger.current = event.currentTarget;
                                        setSelected(shop);
                                    }}
                                >
                                    <PencilSimpleIcon />
                                    Editar
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
                        {search
                            ? 'Nenhuma loja encontrada com esse nome.'
                            : 'Nenhuma loja cadastrada.'}
                    </p>
                )}

                {stores.links.some((link) => !link.active && link.url) && (
                    <Pagination links={stores.links} />
                )}
            </div>

            {selected !== undefined && (
                <StoreEditor
                    selected={selected}
                    onClose={() => setSelected(undefined)}
                />
            )}
        </>
    );
}

StoresIndex.layout = { breadcrumbs: [{ title: 'Lojas', href: index() }] };
