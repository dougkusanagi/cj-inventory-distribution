import { Head } from '@inertiajs/react';
import {
    CircleAlert,
    FolderOpen,
    LayoutPanelTop,
    PanelRight,
    Plus,
    Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useAppearance } from '@/hooks/use-appearance';

const colors = [
    ['Action primary', 'Ação principal', 'bg-action', '--action / --primary'],
    [
        'Brand expressive',
        'Identidade e ênfase',
        'bg-brand-expressive',
        '--brand-expressive',
    ],
    ['Highlight', 'Texto em destaque', 'bg-highlight', '--highlight'],
    ['Destructive', 'Erro e exclusão', 'bg-destructive', '--destructive'],
    ['Secondary', 'Ação de baixa ênfase', 'bg-secondary', '--secondary'],
    ['Muted', 'Superfície de apoio', 'bg-muted', '--muted'],
    ['Background', 'Plano principal', 'bg-background', '--background'],
    ['Foreground', 'Texto e contraste', 'bg-foreground', '--foreground'],
] as const;

function OverlayPreview({
    icon: Icon,
    kind,
    title,
    description,
}: {
    icon: LucideIcon;
    kind: 'dialog' | 'drawer' | 'sheet';
    title: string;
    description: string;
}) {
    return (
        <span className="grid w-full gap-4 whitespace-normal">
            <span className="relative block h-32 overflow-hidden rounded-xl border border-border bg-muted/55">
                <span className="absolute inset-x-4 top-4 h-2 rounded-full bg-border" />
                <span className="absolute top-9 left-4 h-2 w-2/5 rounded-full bg-border/70" />
                {kind === 'dialog' && (
                    <span className="absolute top-1/2 left-1/2 block h-20 w-3/5 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-3 shadow-lg">
                        <span className="block h-2 w-1/2 rounded-full bg-foreground/70" />
                        <span className="mt-2 block h-2 w-full rounded-full bg-input/70" />
                        <span className="mt-3 ml-auto block h-3 w-1/3 rounded-full bg-primary" />
                    </span>
                )}
                {kind === 'drawer' && (
                    <span className="absolute inset-x-2 bottom-0 block h-24 rounded-t-xl border border-b-0 border-border bg-card p-3 shadow-lg">
                        <span className="mx-auto block h-1 w-8 rounded-full bg-muted-foreground/40" />
                        <span className="mt-3 block h-2 w-1/2 rounded-full bg-foreground/70" />
                        <span className="mt-3 block h-4 w-full rounded-full bg-primary" />
                    </span>
                )}
                {kind === 'sheet' && (
                    <span className="absolute inset-y-0 right-0 block w-1/2 border-l border-border bg-card p-3 shadow-lg">
                        <span className="block h-2 w-2/3 rounded-full bg-foreground/70" />
                        <span className="mt-4 block h-2 w-full rounded-full bg-secondary" />
                        <span className="mt-2 block h-2 w-4/5 rounded-full bg-secondary" />
                        <span className="mt-2 block h-2 w-3/5 rounded-full bg-secondary" />
                    </span>
                )}
            </span>
            <span className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-brand" />
                <span>
                    <strong className="block text-foreground">{title}</strong>
                    <span className="mt-1 block text-xs leading-5 font-normal text-muted-foreground">
                        {description}
                    </span>
                </span>
            </span>
        </span>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">
                {eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
            </p>
        </div>
    );
}

export default function DesignSystem() {
    const { resolvedAppearance } = useAppearance();

    return (
        <>
            <Head title="Design system" />
            <main className="min-h-screen overflow-x-hidden bg-background">
                <section className="relative isolate overflow-hidden border-b">
                    <div className="absolute -top-32 left-[12%] -z-10 size-80 rounded-full bg-primary/20 blur-3xl" />
                    <div className="absolute top-12 right-[5%] -z-10 size-72 rounded-full bg-brand/15 blur-3xl" />
                    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
                        <div className="flex items-center justify-between gap-4">
                            <img
                                src={
                                    resolvedAppearance === 'dark'
                                        ? '/images/brand/logo-cronicas-white.png'
                                        : '/images/brand/logo-cronicas-color.png'
                                }
                                alt="Crônicas Jeans"
                                className="h-9 w-auto object-contain sm:h-11"
                            />
                            <AppearanceToggleTab />
                        </div>
                        <div className="grid items-end gap-10 py-16 lg:grid-cols-[1.25fr_0.75fr] lg:py-24">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-brand/35 bg-background/55 px-3 py-1.5 text-xs font-semibold tracking-wide text-brand shadow-sm backdrop-blur">
                                    <Sparkles className="size-3.5" />
                                    Linguagem visual unificada
                                </div>
                                <h1 className="mt-6 max-w-3xl text-4xl leading-[1.04] font-semibold tracking-[-0.045em] text-foreground sm:text-6xl sm:leading-none">
                                    Um sistema feito para a energia da marca.
                                </h1>
                                <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                                    Light com a precisão editorial do spec
                                    sheet. Dark com a profundidade do catálogo.
                                    Amarelo para avançar; vermelho para marcar
                                    presença.
                                </p>
                            </div>
                            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-black/5">
                                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                    Princípio de cor
                                </p>
                                <p className="mt-4 text-xl leading-snug font-medium text-foreground">
                                    O amarelo pede um marrom profundo — nunca
                                    texto branco.
                                </p>
                                <div className="mt-6 grid overflow-hidden rounded-xl border border-border shadow-sm sm:grid-cols-2">
                                    <div className="bg-primary p-4 text-primary-foreground">
                                        <p className="text-xs font-semibold tracking-wide uppercase">
                                            Primary + on-primary
                                        </p>
                                        <p className="mt-2 text-lg font-bold">
                                            Texto marrom no amarelo
                                        </p>
                                    </div>
                                    <div className="bg-card p-4">
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            Highlight text
                                        </p>
                                        <p className="mt-2 text-lg font-bold text-highlight">
                                            Ênfase editorial
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mx-auto flex max-w-7xl flex-col gap-20 px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
                    <section>
                        <SectionHeading
                            eyebrow="01 / fundamentos"
                            title="Cores com papéis claros"
                            description="O vermelho continua uma assinatura da marca, mas não substitui as cores semânticas de perigo. Secondary permanece neutro para que ações secundárias não disputem atenção."
                        />
                        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {colors.map(([name, role, className, token]) => (
                                <div
                                    key={name}
                                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
                                >
                                    <div
                                        className={`${className} size-12 rounded-xl border border-black/5 shadow-inner`}
                                    />
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            {name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {role}
                                        </p>
                                        <code className="mt-1 block text-xs text-highlight">
                                            {token}
                                        </code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                        <SectionHeading
                            eyebrow="02 / ações"
                            title="Hierarquia antes de decoração"
                            description="Quatro papéis cobrem a interface: primary avança, secondary oferece uma alternativa, destructive sinaliza risco e ghost encerra ou cancela sem competir por atenção."
                        />
                        <Card className="rounded-[2rem] py-0">
                            <CardContent className="flex flex-wrap items-center gap-3 p-6 sm:p-8">
                                <Button>
                                    <Plus /> Salvar produto
                                </Button>
                                <Button variant="secondary">
                                    Salvar rascunho
                                </Button>
                                <Button variant="destructive">Excluir</Button>
                                <Button variant="ghost">Cancelar</Button>
                            </CardContent>
                        </Card>
                    </section>

                    <section>
                        <SectionHeading
                            eyebrow="03 / superfícies"
                            title="Cards quentes, silenciosos e bem delimitados"
                            description="Raios generosos e bordas de baixo contraste deixam a informação respirar sem perder estrutura — mais claro no light, mais denso no dark."
                        />
                        <div className="mt-8 grid gap-5 md:grid-cols-3">
                            <Card className="rounded-[1.5rem]">
                                <CardHeader>
                                    <Badge className="mb-2">Em estoque</Badge>
                                    <CardTitle>Base de produto</CardTitle>
                                    <CardDescription>
                                        Informação prioritária em uma superfície
                                        neutra.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-semibold text-foreground">
                                        284
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        unidades disponíveis
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="rounded-[1.5rem] border-primary/30 bg-featured-card text-featured-card-foreground shadow-[0_16px_40px_-28px_oklch(0.2_0.08_55/0.65)] dark:border-primary/35 dark:shadow-[0_18px_50px_-26px_oklch(0.78_0.15_80/0.22)]">
                                <CardHeader>
                                    <Badge className="w-fit border-primary/35 bg-primary/12 text-featured-card-foreground">
                                        Destaque
                                    </Badge>
                                    <CardTitle className="text-featured-card-foreground">
                                        Identidade em destaque
                                    </CardTitle>
                                    <CardDescription className="text-featured-card-muted">
                                        Uma superfície quente e elevada para
                                        conteúdo editorial prioritário.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <div className="h-2 flex-1 rounded-full bg-featured-card-foreground/15" />
                                        <div className="h-2 w-1/4 rounded-full bg-primary" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="rounded-[1.5rem]">
                                <CardHeader>
                                    <Badge
                                        variant="outline"
                                        className="border-brand/40 text-brand"
                                    >
                                        Marca
                                    </Badge>
                                    <CardTitle>
                                        Vermelho, com intenção
                                    </CardTitle>
                                    <CardDescription>
                                        Use em destaques editoriais, status
                                        especiais e momentos de marca.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-2 w-2/3 rounded-full bg-brand" />
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <section className="grid gap-8 lg:grid-cols-2">
                        <div>
                            <SectionHeading
                                eyebrow="04 / formulários"
                                title="Clareza para preencher sem atrito"
                                description="Inputs usam borda contida, foco amarelo e mensagens de erro reservadas ao token destructive."
                            />
                            <Card className="mt-8 rounded-[2rem]">
                                <CardContent className="grid gap-5 pt-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="product-name">
                                            Nome do produto
                                        </Label>
                                        <Input
                                            id="product-name"
                                            placeholder="Ex.: Calça reta jeans"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Categoria</Label>
                                        <Select>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Selecione uma categoria" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="jeans">
                                                    Jeans
                                                </SelectItem>
                                                <SelectItem value="camisetas">
                                                    Camisetas
                                                </SelectItem>
                                                <SelectItem value="acessorios">
                                                    Acessórios
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Checkbox id="featured" />
                                        <Label htmlFor="featured">
                                            Destacar no catálogo
                                        </Label>
                                    </div>
                                    <Alert variant="destructive">
                                        <CircleAlert />
                                        <AlertTitle>
                                            Campo obrigatório
                                        </AlertTitle>
                                        <AlertDescription>
                                            Informe o nome antes de salvar o
                                            produto.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:pt-[5.7rem]">
                            <Card className="rounded-[2rem] border-0 bg-muted">
                                <CardHeader>
                                    <CardTitle>Tipografia e ritmo</CardTitle>
                                    <CardDescription>
                                        Interface direta, contraste firme e
                                        espaços previsíveis.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <p className="text-4xl font-semibold tracking-tight">
                                        Produtos que contam histórias.
                                    </p>
                                    <p className="leading-7 text-muted-foreground">
                                        Use títulos concisos, textos de apoio em
                                        tom calmo e números com peso suficiente
                                        para leitura rápida.
                                    </p>
                                    <div className="grid grid-cols-3 border-t border-border pt-5 text-center">
                                        <div>
                                            <p className="text-xl font-semibold text-foreground">
                                                8
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                base
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-semibold text-foreground">
                                                16
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                ritmo
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-semibold text-foreground">
                                                32
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                respiro
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <section>
                        <SectionHeading
                            eyebrow="05 / sobreposições"
                            title="O componente acompanha o contexto"
                            description="O mesmo conteúdo muda de contêiner conforme a tarefa e o tamanho da tela. Experimente os três componentes."
                        />
                        <div className="mt-8 grid gap-5 md:grid-cols-3">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-auto w-full justify-start rounded-2xl p-4 text-left"
                                    >
                                        <OverlayPreview
                                            icon={LayoutPanelTop}
                                            kind="dialog"
                                            title="Dialog"
                                            description="Tarefa concentrada ou confirmação no desktop."
                                        />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Editar coleção
                                        </DialogTitle>
                                        <DialogDescription>
                                            Uma tarefa concentrada, sem tirar a
                                            pessoa do contexto.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-2">
                                        <Label htmlFor="collection-name">
                                            Nome
                                        </Label>
                                        <Input
                                            id="collection-name"
                                            defaultValue="Inverno 2026"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost">
                                            Cancelar
                                        </Button>
                                        <Button>Salvar</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Drawer>
                                <DrawerTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-auto w-full justify-start rounded-2xl p-4 text-left"
                                    >
                                        <OverlayPreview
                                            icon={FolderOpen}
                                            kind="drawer"
                                            title="Drawer"
                                            description="Ações e formulários ao alcance do polegar no mobile."
                                        />
                                    </Button>
                                </DrawerTrigger>
                                <DrawerContent>
                                    <DrawerHeader>
                                        <DrawerTitle>
                                            Novo movimento
                                        </DrawerTitle>
                                        <DrawerDescription>
                                            Em telas pequenas, a ação sobe do
                                            rodapé e mantém o alcance
                                            confortável.
                                        </DrawerDescription>
                                    </DrawerHeader>
                                    <div className="px-6">
                                        <Input
                                            placeholder="Quantidade"
                                            inputMode="numeric"
                                        />
                                    </div>
                                    <DrawerFooter>
                                        <Button>Registrar movimento</Button>
                                        <DrawerClose asChild>
                                            <Button variant="ghost">
                                                Cancelar
                                            </Button>
                                        </DrawerClose>
                                    </DrawerFooter>
                                </DrawerContent>
                            </Drawer>
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="h-auto w-full justify-start rounded-2xl p-4 text-left"
                                    >
                                        <OverlayPreview
                                            icon={PanelRight}
                                            kind="sheet"
                                            title="Sheet"
                                            description="Navegação, filtros e conteúdo complementar."
                                        />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent>
                                    <SheetHeader>
                                        <SheetTitle>
                                            Filtros do catálogo
                                        </SheetTitle>
                                        <SheetDescription>
                                            Conteúdo complementar, persistente
                                            na intenção e dispensável sem perda
                                            de contexto.
                                        </SheetDescription>
                                    </SheetHeader>
                                    <div className="grid gap-3 px-4">
                                        <Button
                                            variant="secondary"
                                            className="justify-start"
                                        >
                                            Novidades
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="justify-start"
                                        >
                                            Mais vendidos
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="justify-start"
                                        >
                                            Em promoção
                                        </Button>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </section>

                    <footer className="flex flex-col justify-between gap-4 border-t border-border pt-8 text-sm sm:flex-row sm:items-center">
                        <p className="text-muted-foreground">
                            Fonte:{' '}
                            <span className="text-foreground">
                                cj-spec-sheet
                            </span>{' '}
                            (light),{' '}
                            <span className="text-foreground">cj-catalogo</span>{' '}
                            (dark) e{' '}
                            <span className="text-foreground">
                                cj-formularios
                            </span>{' '}
                            (amarelo + marrom).
                        </p>
                        <p className="font-semibold text-highlight">
                            Tema atual: {resolvedAppearance}
                        </p>
                    </footer>
                </div>
            </main>
        </>
    );
}
