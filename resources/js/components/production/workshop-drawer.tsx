import { useForm, useHttp, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { MinusCircleIcon, PlusCircleIcon } from '@phosphor-icons/react';
import {
    advance,
    split,
} from '@/actions/App/Http/Controllers/ProductionBatchController';
import {
    store,
    update,
} from '@/actions/App/Http/Controllers/WorkshopController';
import InputError from '@/components/input-error';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';

export type Workshop = {
    id: number;
    name: string;
    type: string;
    is_active: boolean;
};
type Batch = {
    id: number;
    code: string;
    stage: string;
    version: number;
    quantity: number;
};

export function AdvanceWorkshopDrawer({
    batch,
    target,
    label,
    workshops,
    onClose,
}: {
    batch: Batch;
    target: string;
    label: string;
    workshops: Workshop[];
    onClose: () => void;
}) {
    const mobile = useIsMobile();
    const { errors } = usePage().props;
    const [options, setOptions] = useState(workshops);
    const [newName, setNewName] = useState<string | null>(null);
    const [splitMode, setSplitMode] = useState(false);
    const [createFor, setCreateFor] = useState<number | null>(null);
    const [requestError, setRequestError] = useState('');
    const form = useForm({
        stage: batch.stage,
        target,
        version: batch.version,
        workshop_id: '',
    });
    const create = useHttp<{ name: string; type: string }, Workshop>({
        name: '',
        type: target,
    });
    const splitForm = useForm({
        stage: batch.stage,
        target,
        version: batch.version,
        allocations: [
            { workshop_id: '', quantity: '' },
            { workshop_id: '', quantity: '' },
        ],
    });
    const workshopOptions = options
        .filter((item) => item.is_active && item.type === target)
        .map((item) => ({ value: String(item.id), label: item.name }));
    async function createWorkshop(event: FormEvent) {
        event.preventDefault();
        setRequestError('');
        try {
            const created = await create.post(store.url());
            if (created) {
                setOptions((current) => [...current, created]);
                if (createFor === null)
                    form.setData('workshop_id', String(created.id));
                else
                    splitForm.setData(
                        'allocations',
                        splitForm.data.allocations.map((row, index) =>
                            index === createFor
                                ? { ...row, workshop_id: String(created.id) }
                                : row,
                        ),
                    );
                setCreateFor(null);
                setNewName(null);
            }
        } catch {
            setRequestError(
                'Não foi possível cadastrar a oficina. Tente novamente.',
            );
        }
    }
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(advance.url(batch.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }
    function submitSplit(event: FormEvent) {
        event.preventDefault();
        splitForm.post(split.url(batch.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }
    return (
        <Drawer
            open
            direction={mobile ? 'bottom' : 'right'}
            onOpenChange={(open) => {
                if (
                    !open &&
                    !form.processing &&
                    !splitForm.processing &&
                    !create.processing
                )
                    onClose();
            }}
        >
            <DrawerContent side={mobile ? 'bottom' : 'right'}>
                <DrawerHeader>
                    <DrawerTitle>
                        Enviar {batch.code} para {label}
                    </DrawerTitle>
                    <DrawerDescription>
                        Escolha a execução interna ou uma oficina para esta
                        etapa.
                    </DrawerDescription>
                </DrawerHeader>
                {newName === null && splitMode ? (
                    <form
                        onSubmit={submitSplit}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="grid gap-4 overflow-y-auto px-6 pb-6">
                            <p className="text-sm">
                                Distribua as {batch.quantity} peças entre
                                oficinas diferentes. O lote original ficará no
                                histórico e não poderá ser reunido pelo painel.
                            </p>
                            {splitForm.data.allocations.map((row, index) => (
                                <div
                                    key={index}
                                    className="grid gap-2 rounded-xl border p-3"
                                >
                                    <Label htmlFor={`split-workshop-${index}`}>
                                        Oficina {index + 1}
                                    </Label>
                                    <SearchableSelect
                                        id={`split-workshop-${index}`}
                                        label={`Oficina ${index + 1}`}
                                        value={row.workshop_id || 'none'}
                                        options={[
                                            {
                                                value: 'none',
                                                label: 'Selecione uma oficina',
                                            },
                                            ...workshopOptions,
                                        ]}
                                        onValueChange={(value) =>
                                            splitForm.setData(
                                                'allocations',
                                                splitForm.data.allocations.map(
                                                    (item, position) =>
                                                        position === index
                                                            ? {
                                                                  ...item,
                                                                  workshop_id:
                                                                      value ===
                                                                      'none'
                                                                          ? ''
                                                                          : value,
                                                              }
                                                            : item,
                                                ),
                                            )
                                        }
                                        onCreate={(name) => {
                                            setCreateFor(index);
                                            create.setData('name', name);
                                            setNewName(name);
                                        }}
                                        createLabel="Cadastrar oficina"
                                    />
                                    <InputError
                                        message={
                                            errors[
                                                `allocations.${index}.workshop_id`
                                            ]
                                        }
                                    />
                                    <Label htmlFor={`split-quantity-${index}`}>
                                        Quantidade de peças
                                    </Label>
                                    <Input
                                        id={`split-quantity-${index}`}
                                        type="number"
                                        min="1"
                                        max={batch.quantity}
                                        required
                                        value={row.quantity}
                                        onChange={(event) =>
                                            splitForm.setData(
                                                'allocations',
                                                splitForm.data.allocations.map(
                                                    (item, position) =>
                                                        position === index
                                                            ? {
                                                                  ...item,
                                                                  quantity:
                                                                      event
                                                                          .target
                                                                          .value,
                                                              }
                                                            : item,
                                                ),
                                            )
                                        }
                                    />
                                    <InputError
                                        message={
                                            errors[
                                                `allocations.${index}.quantity`
                                            ]
                                        }
                                    />
                                    {splitForm.data.allocations.length > 2 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() =>
                                                splitForm.setData(
                                                    'allocations',
                                                    splitForm.data.allocations.filter(
                                                        (_, position) =>
                                                            position !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            <MinusCircleIcon /> Remover oficina
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <p className="text-sm">
                                Distribuído:{' '}
                                {splitForm.data.allocations.reduce(
                                    (sum, row) =>
                                        sum + (Number(row.quantity) || 0),
                                    0,
                                )}{' '}
                                de {batch.quantity} peças.
                            </p>
                            <InputError
                                message={
                                    errors.allocations ||
                                    errors.version ||
                                    errors.batch ||
                                    errors.stage
                                }
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    splitForm.setData('allocations', [
                                        ...splitForm.data.allocations,
                                        { workshop_id: '', quantity: '' },
                                    ])
                                }
                            >
                                <PlusCircleIcon /> Adicionar oficina
                            </Button>
                        </div>
                        <DrawerFooter>
                            <Button
                                type="submit"
                                className="h-11"
                                disabled={splitForm.processing}
                            >
                                {splitForm.processing
                                    ? 'Enviando...'
                                    : 'Dividir e enviar'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11"
                                onClick={() => setSplitMode(false)}
                                disabled={splitForm.processing}
                            >
                                Voltar
                            </Button>
                        </DrawerFooter>
                    </form>
                ) : newName === null ? (
                    <form
                        onSubmit={submit}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="grid gap-3 overflow-y-auto px-6 pb-6">
                            <Label htmlFor="workshop-select">
                                Local da etapa
                            </Label>
                            <SearchableSelect
                                id="workshop-select"
                                label="Oficina"
                                value={form.data.workshop_id || 'internal'}
                                options={[
                                    {
                                        value: 'internal',
                                        label: 'Produção interna',
                                    },
                                    ...workshopOptions,
                                ]}
                                onValueChange={(value) =>
                                    form.setData(
                                        'workshop_id',
                                        value === 'internal' ? '' : value,
                                    )
                                }
                                onCreate={(name) => {
                                    setCreateFor(null);
                                    create.setData('name', name);
                                    setNewName(name);
                                }}
                                createLabel="Cadastrar oficina"
                            />
                            <InputError
                                message={
                                    form.errors.workshop_id ||
                                    form.errors.version ||
                                    errors.batch ||
                                    form.errors.stage
                                }
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSplitMode(true)}
                                disabled={batch.quantity < 2 || form.processing}
                            >
                                Dividir entre oficinas
                            </Button>
                            {batch.quantity < 2 && (
                                <p className="text-sm text-muted-foreground">
                                    A divisão exige pelo menos duas peças.
                                </p>
                            )}
                        </div>
                        <DrawerFooter>
                            <Button
                                type="submit"
                                className="h-11"
                                disabled={form.processing}
                            >
                                {form.processing
                                    ? 'Enviando...'
                                    : 'Enviar lote'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11"
                                onClick={onClose}
                                disabled={form.processing}
                            >
                                Cancelar
                            </Button>
                        </DrawerFooter>
                    </form>
                ) : (
                    <form
                        onSubmit={createWorkshop}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="grid gap-3 px-6 pb-6">
                            <Label htmlFor="workshop-name">
                                Nome da oficina
                            </Label>
                            <Input
                                id="workshop-name"
                                required
                                maxLength={100}
                                value={create.data.name}
                                onChange={(event) =>
                                    create.setData('name', event.target.value)
                                }
                            />
                            <InputError
                                message={
                                    create.errors.name ||
                                    create.errors.type ||
                                    requestError
                                }
                            />
                        </div>
                        <DrawerFooter>
                            <Button
                                type="submit"
                                className="h-11"
                                disabled={create.processing}
                            >
                                {create.processing
                                    ? 'Cadastrando...'
                                    : 'Cadastrar oficina'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11"
                                onClick={() => setNewName(null)}
                                disabled={create.processing}
                            >
                                Voltar
                            </Button>
                        </DrawerFooter>
                    </form>
                )}
            </DrawerContent>
        </Drawer>
    );
}

export function ManageWorkshopsDrawer({
    workshops,
    onClose,
}: {
    workshops: Workshop[];
    onClose: () => void;
}) {
    const mobile = useIsMobile();
    const [items, setItems] = useState(workshops);
    const [selected, setSelected] = useState<Workshop | null>(null);
    return (
        <Drawer
            open
            direction={mobile ? 'bottom' : 'right'}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DrawerContent side={mobile ? 'bottom' : 'right'}>
                <DrawerHeader>
                    <DrawerTitle>Oficinas</DrawerTitle>
                    <DrawerDescription>
                        Altere o nome ou a disponibilidade das oficinas
                        cadastradas.
                    </DrawerDescription>
                </DrawerHeader>
                <div className="grid gap-3 overflow-y-auto px-6 pb-6">
                    {selected ? (
                        <WorkshopEditor
                            key={selected.id}
                            workshop={selected}
                            onCancel={() => setSelected(null)}
                            onSaved={(saved) => {
                                setItems((current) =>
                                    current.map((item) =>
                                        item.id === saved.id ? saved : item,
                                    ),
                                );
                                setSelected(null);
                            }}
                        />
                    ) : items.length ? (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 border-b py-2"
                            >
                                <span className="min-w-0 break-words">
                                    {item.name} ·{' '}
                                    {
                                        (
                                            {
                                                sewing: 'Costura',
                                                washing: 'Lavanderia',
                                                dyeing: 'Tinturaria',
                                            } as Record<string, string>
                                        )[item.type]
                                    }
                                    {!item.is_active && ' · Inativa'}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => setSelected(item)}
                                >
                                    Editar
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p>
                            Nenhuma oficina cadastrada. Cadastre uma ao enviar
                            um lote.
                        </p>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function WorkshopEditor({
    workshop,
    onCancel,
    onSaved,
}: {
    workshop: Workshop;
    onCancel: () => void;
    onSaved: (workshop: Workshop) => void;
}) {
    const [requestError, setRequestError] = useState('');
    const form = useHttp<
        { name: string; type: string; is_active: boolean },
        Workshop
    >({
        name: workshop.name,
        type: workshop.type,
        is_active: workshop.is_active,
    });
    async function submit(event: FormEvent) {
        event.preventDefault();
        setRequestError('');
        try {
            const saved = await form.patch(update.url(workshop.id));
            if (saved) onSaved(saved);
        } catch {
            setRequestError('Não foi possível salvar. Tente novamente.');
        }
    }
    return (
        <form onSubmit={submit} className="grid gap-3">
            <Label htmlFor="edit-workshop">Nome da oficina</Label>
            <Input
                id="edit-workshop"
                value={form.data.name}
                maxLength={100}
                required
                onChange={(event) => form.setData('name', event.target.value)}
            />
            <InputError
                message={form.errors.name || form.errors.type || requestError}
            />
            <div className="flex items-center gap-3">
                <Switch
                    id="workshop-active"
                    checked={form.data.is_active}
                    onCheckedChange={(value) =>
                        form.setData('is_active', value)
                    }
                />
                <Label htmlFor="workshop-active">Oficina ativa</Label>
            </div>
            <div className="flex gap-3">
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={form.processing}
                >
                    Voltar
                </Button>
            </div>
        </form>
    );
}
