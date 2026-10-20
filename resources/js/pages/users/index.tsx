import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    DotsThreeIcon,
    EnvelopeSimpleIcon,
    FloppyDiskIcon,
    MagnifyingGlassIcon,
    PencilSimpleIcon,
    PlusCircleIcon,
    ShieldCheckIcon,
    UserCircleIcon,
    UsersIcon,
    WarehouseIcon,
    ImagesIcon,
} from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { store, update } from '@/actions/App/Http/Controllers/UserController';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioCardGroup } from '@/components/ui/radio-card-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { accessLink, index } from '@/routes/users';
import type { Paginated, User, UserRole } from '@/types';

type ManagedUser = Pick<
    User,
    | 'id'
    | 'name'
    | 'email'
    | 'role'
    | 'is_active'
    | 'email_verified_at'
    | 'created_at'
>;
type RoleOption = { value: UserRole; label: string };
type Filters = { search: string; role: string; status: string };

const roleIcons = {
    admin: ShieldCheckIcon,
    stock: WarehouseIcon,
    marketing: ImagesIcon,
};
const roleDescriptions = {
    admin: 'Gerencia usuários, produtos, estoque, pedidos e configurações.',
    stock: 'Opera produtos, estoque, pedidos e configurações do catálogo.',
    marketing:
        'Gerencia somente as fotos dos produtos e as próprias configurações de conta.',
};

function UserAccountDrawer({
    user,
    roles,
    onClose,
}: {
    user?: ManagedUser;
    roles: RoleOption[];
    onClose: () => void;
}) {
    const mobile = useIsMobile();
    const { auth } = usePage().props;
    const ownAccount = user?.id === auth.user.id;
    const form = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? ('marketing' as UserRole),
        is_active: user?.is_active ?? true,
    });
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (user) form.put(update.url(user.id), options);
        else form.post(store.url(), options);
    };

    return (
        <Drawer
            direction={mobile ? 'bottom' : 'right'}
            open
            onOpenChange={(open) => {
                if (!open && !form.processing) onClose();
            }}
        >
            <DrawerContent
                side={mobile ? 'bottom' : 'right'}
                data-testid="user-account-drawer"
            >
                <DrawerHeader>
                    <DrawerTitle>
                        {user ? 'Editar usuário' : 'Novo usuário'}
                    </DrawerTitle>
                    <DrawerDescription>
                        {user
                            ? 'Atualize os dados e o perfil de acesso da pessoa.'
                            : 'A pessoa receberá um link por e-mail para definir a própria senha.'}
                    </DrawerDescription>
                </DrawerHeader>
                <form
                    onSubmit={submit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="grid gap-5 overflow-y-auto px-5 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="account-name">Nome</Label>
                            <Input
                                id="account-name"
                                name="name"
                                autoComplete="name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                required
                                maxLength={255}
                                disabled={form.processing}
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="account-email">E-mail</Label>
                            <Input
                                id="account-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                                required
                                maxLength={255}
                                disabled={form.processing}
                            />
                            <InputError message={form.errors.email} />
                            {user && (
                                <p className="text-sm text-muted-foreground">
                                    Se o e-mail mudar, será necessário confirmar
                                    o novo endereço.
                                </p>
                            )}
                        </div>
                        <div className="grid gap-3">
                            <Label id="account-role-label">
                                Perfil de acesso
                            </Label>
                            <RadioCardGroup
                                aria-labelledby="account-role-label"
                                value={form.data.role}
                                onValueChange={(value) =>
                                    form.setData('role', value as UserRole)
                                }
                                disabled={form.processing || ownAccount}
                                options={roles.map((role) => ({
                                    value: role.value,
                                    label: role.label,
                                    icon: roleIcons[role.value],
                                }))}
                            />
                            <p className="text-sm text-muted-foreground">
                                {ownAccount
                                    ? 'Seu próprio perfil de administrador não pode ser removido por esta tela.'
                                    : roleDescriptions[form.data.role]}
                            </p>
                            <InputError message={form.errors.role} />
                        </div>
                    </div>
                    <DrawerFooter className="border-t border-border">
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="h-11"
                        >
                            {user ? <FloppyDiskIcon /> : <EnvelopeSimpleIcon />}
                            {form.processing
                                ? 'Salvando...'
                                : user
                                  ? 'Salvar alterações'
                                  : 'Criar e enviar link'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={form.processing}
                            className="h-11"
                        >
                            Cancelar
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}

export default function UsersIndex({
    users,
    filters,
    roles,
}: {
    users: Paginated<ManagedUser> & { total: number };
    filters: Filters;
    roles: RoleOption[];
}) {
    const { auth, errors } = usePage().props;
    const [editor, setEditor] = useState<{ user?: ManagedUser } | null>(null);
    const [accessChange, setAccessChange] = useState<ManagedUser | null>(null);
    const [busy, setBusy] = useState<number | null>(null);
    const [search, setSearch] = useState(filters.search);
    const [role, setRole] = useState(filters.role || 'all');
    const [status, setStatus] = useState(filters.status);
    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(
            index.url(),
            { search, role: role === 'all' ? '' : role, status },
            { preserveState: true, preserveScroll: true },
        );
    };
    const sendLink = (user: ManagedUser) => {
        setBusy(user.id);
        router.post(
            accessLink.url(user.id),
            {},
            { preserveScroll: true, onFinish: () => setBusy(null) },
        );
    };
    const hasFilters =
        filters.search !== '' ||
        filters.role !== '' ||
        filters.status !== 'all';

    return (
        <>
            <Head title="Usuários" />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-2">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Usuários
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Controle quem pode acessar o painel e o que cada
                            pessoa pode fazer.
                        </p>
                    </div>
                    <Button className="h-11" onClick={() => setEditor({})}>
                        <PlusCircleIcon />
                        Novo usuário
                    </Button>
                </header>
                <form
                    onSubmit={submitSearch}
                    className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end"
                >
                    <div className="grid gap-2">
                        <Label htmlFor="users-search">Buscar pessoa</Label>
                        <Input
                            id="users-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Nome ou e-mail"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="users-role-filter">Perfil</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger id="users-role-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Todos os perfis
                                </SelectItem>
                                {roles.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="users-status-filter">Acesso</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger id="users-status-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="active">Ativo</SelectItem>
                                <SelectItem value="inactive">
                                    Desativado
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" variant="secondary">
                        <MagnifyingGlassIcon />
                        Buscar
                    </Button>
                </form>
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <p>
                        {users.total}{' '}
                        {users.total === 1 ? 'usuário' : 'usuários'}
                    </p>
                    {hasFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch('');
                                setRole('all');
                                setStatus('all');
                                router.get(
                                    index.url(),
                                    {},
                                    { preserveState: true },
                                );
                            }}
                        >
                            Limpar filtros
                        </Button>
                    )}
                </div>
                {!editor && <InputError message={errors.role} />}
                <div className="grid gap-3">
                    {users.data.map((user) => (
                        <Card
                            key={user.id}
                            className="gap-3 p-4"
                            data-testid={`managed-user-${user.id}`}
                        >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                                <div className="grid min-w-0 gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-semibold break-words">
                                            {user.name}
                                        </h2>
                                        {user.id === auth.user.id && (
                                            <Badge variant="outline">
                                                Você
                                            </Badge>
                                        )}
                                        <Badge
                                            variant={
                                                user.is_active
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                        >
                                            {user.is_active
                                                ? 'Ativo'
                                                : 'Desativado'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm break-all text-muted-foreground">
                                        {user.email}
                                    </p>
                                </div>
                                <div className="col-span-2 row-start-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-11"
                                        onClick={() => setEditor({ user })}
                                        disabled={busy !== null}
                                        aria-label={`Editar ${user.name}`}
                                    >
                                        <PencilSimpleIcon />
                                        Editar
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-11"
                                        disabled={
                                            !user.is_active || busy !== null
                                        }
                                        onClick={() => sendLink(user)}
                                        aria-label={`Enviar link para ${user.name}`}
                                    >
                                        <EnvelopeSimpleIcon />
                                        {busy === user.id
                                            ? 'Enviando...'
                                            : 'Enviar link'}
                                    </Button>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Ações de ${user.name}`}
                                        >
                                            <DotsThreeIcon weight="bold" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            disabled={
                                                user.id === auth.user.id ||
                                                user.role === null ||
                                                busy !== null
                                            }
                                            onClick={() =>
                                                setAccessChange(user)
                                            }
                                        >
                                            {user.is_active
                                                ? 'Desativar acesso'
                                                : 'Reativar acesso'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                    <UserCircleIcon />
                                    {roles.find(
                                        (option) => option.value === user.role,
                                    )?.label ?? 'Sem perfil'}
                                </span>
                                <span>
                                    {user.email_verified_at
                                        ? 'E-mail confirmado'
                                        : 'Aguardando confirmação do e-mail'}
                                </span>
                            </div>
                        </Card>
                    ))}
                    {users.data.length === 0 && (
                        <Card className="items-center p-8 text-center">
                            <UsersIcon />
                            <p>
                                {hasFilters
                                    ? 'Nenhum usuário encontrado para estes filtros.'
                                    : 'Nenhum usuário cadastrado.'}
                            </p>
                        </Card>
                    )}
                </div>
                <Pagination links={users.links} />
            </div>
            {editor && (
                <UserAccountDrawer
                    key={editor.user?.id ?? 'new'}
                    user={editor.user}
                    roles={roles}
                    onClose={() => setEditor(null)}
                />
            )}
            <ConfirmationDialog
                open={accessChange !== null}
                onOpenChange={(open) => {
                    if (!open && busy === null) setAccessChange(null);
                }}
                title={`${accessChange?.is_active ? 'Desativar' : 'Reativar'} o acesso de ${accessChange?.name ?? ''}?`}
                description={
                    accessChange?.is_active
                        ? 'A pessoa deixará de acessar o painel. Seus registros no histórico serão preservados.'
                        : 'A pessoa voltará a acessar o painel com o perfil atribuído à conta.'
                }
                confirmLabel={
                    accessChange?.is_active
                        ? 'Desativar acesso'
                        : 'Reativar acesso'
                }
                destructive={accessChange?.is_active}
                disabled={busy !== null}
                onConfirm={() => {
                    if (!accessChange) return;
                    setBusy(accessChange.id);
                    router.put(
                        update.url(accessChange.id),
                        {
                            name: accessChange.name,
                            email: accessChange.email,
                            role: accessChange.role,
                            is_active: !accessChange.is_active,
                        },
                        {
                            preserveScroll: true,
                            onSuccess: () => setAccessChange(null),
                            onError: () => setAccessChange(null),
                            onFinish: () => setBusy(null),
                        },
                    );
                }}
            />
        </>
    );
}

UsersIndex.layout = { breadcrumbs: [{ title: 'Usuários', href: index() }] };
