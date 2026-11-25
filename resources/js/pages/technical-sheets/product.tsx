import { Head, Link, useForm } from '@inertiajs/react';
import {
    ClockCounterClockwiseIcon,
    PlusCircleIcon,
} from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { index, revise, show, store } from '@/routes/technical-sheets';
import type { ProductReference, Revision } from './data';
import { statusLabels } from './data';
import { RevisionDrawer } from './revision-drawer';

export default function ProductSheets({
    product,
    history,
    approved,
    openRevision,
}: {
    product: ProductReference;
    history: Revision[];
    approved: Revision | null;
    openRevision: Revision | null;
}) {
    const [historyOpen, setHistoryOpen] = useState(false);
    const historyTrigger = useRef<HTMLButtonElement>(null);
    const form = useForm({ version: approved?.version ?? 1 });
    const start = () =>
        form.submit(approved ? revise(approved.id) : store(product.id));

    const renderRevision = (item: Revision) => (
        <Button
            key={item.id}
            asChild
            variant="outline"
            className="h-11 justify-between"
        >
            <Link href={show(item.id)}>
                Revisão {item.revision}
                <Badge variant="secondary">{statusLabels[item.status]}</Badge>
            </Link>
        </Button>
    );

    return (
        <>
            <Head title={`Fichas de ${product.name}`} />
            <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 sm:px-6">
                <div>
                    <h1 className="text-3xl font-semibold break-words">
                        {product.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {product.code}
                        {product.model && ` · Mod. ${product.model}`}
                    </p>
                </div>
                <Card className="grid gap-3 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold">Revisões atuais</h2>
                    {!approved && !openRevision && (
                        <p className="text-sm text-muted-foreground">
                            Não há revisão aprovada ou aberta para este produto.
                        </p>
                    )}
                    {approved && renderRevision(approved)}
                    {openRevision && renderRevision(openRevision)}
                    <InputError message={form.errors.version} />
                    {!openRevision && (
                        <Button
                            className="h-11"
                            disabled={form.processing}
                            onClick={start}
                        >
                            <PlusCircleIcon />
                            {form.processing
                                ? 'Criando revisão…'
                                : approved
                                  ? 'Criar nova revisão'
                                  : 'Criar ficha técnica'}
                        </Button>
                    )}
                    {history.length > 0 && (
                        <Button
                            ref={historyTrigger}
                            variant="outline"
                            className="h-11"
                            onClick={() => setHistoryOpen(true)}
                        >
                            <ClockCounterClockwiseIcon /> Histórico de revisões
                        </Button>
                    )}
                </Card>
                <Button
                    asChild
                    variant="outline"
                    className="h-11 justify-self-start"
                >
                    <Link href={index()}>Voltar aos produtos</Link>
                </Button>
            </div>
            {historyOpen && (
                <RevisionDrawer
                    title="Histórico de revisões"
                    description={product.name}
                    onClose={() => {
                        setHistoryOpen(false);
                        requestAnimationFrame(() =>
                            historyTrigger.current?.focus(),
                        );
                    }}
                >
                    {history.map(renderRevision)}
                </RevisionDrawer>
            )}
        </>
    );
}
