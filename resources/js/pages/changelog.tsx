import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon, NewspaperIcon } from '@phosphor-icons/react';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';
import type { Paginated } from '@/types';

type Change = {
    category: 'added' | 'improved' | 'fixed';
    text: string;
};

type Note = {
    title: string;
    changes: Change[];
    pr_number: number;
    merged_at: string;
};

const categories = {
    added: 'Novidades',
    improved: 'Melhorias',
    fixed: 'Correções',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
});

export default function Changelog({
    notes,
}: {
    notes: Omit<Paginated<Note>, 'meta'> & { last_page: number };
}) {
    return (
        <>
            <Head title="O que há de novo" />
            <div className="min-h-screen bg-background text-foreground">
                <div className="mx-auto grid w-full max-w-3xl gap-10 px-5 py-6 sm:px-8 sm:py-10">
                    <nav
                        aria-label="Navegação da página"
                        className="flex flex-wrap items-center justify-between gap-3"
                    >
                        <Button variant="ghost" asChild>
                            <Link href={home()}>
                                <ArrowLeftIcon weight="bold" />
                                Voltar ao catálogo
                            </Link>
                        </Button>
                        <AppearanceToggleTab className="w-auto shrink-0" />
                    </nav>
                    <header className="grid gap-4">
                        <h1 className="ds-display text-4xl text-balance sm:text-5xl">
                            O que há de novo
                        </h1>
                        <p className="max-w-xl text-base leading-7 text-muted-foreground">
                            Acompanhe o que foi adicionado, melhorado e
                            corrigido, incluindo os cuidados com as ferramentas
                            que mantêm o sistema funcionando.
                        </p>
                    </header>
                    {notes.data.length === 0 ? (
                        <div className="grid justify-items-start gap-3 border-t border-border py-10">
                            <NewspaperIcon className="size-8 text-muted-foreground" />
                            <h2 className="text-xl font-semibold">
                                As próximas atualizações aparecem aqui
                            </h2>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Quando uma atualização estiver disponível, você
                                poderá consultar o resumo das mudanças nesta
                                página.
                            </p>
                        </div>
                    ) : (
                        <div className="grid">
                            {notes.data.map((note) => (
                                <article
                                    key={note.pr_number}
                                    className="grid gap-5 border-t border-border py-8"
                                    aria-labelledby={`note-${note.pr_number}`}
                                >
                                    <div className="grid gap-2">
                                        <time
                                            dateTime={note.merged_at}
                                            className="text-sm text-muted-foreground"
                                        >
                                            {dateFormatter.format(
                                                new Date(note.merged_at),
                                            )}
                                        </time>
                                        <h2
                                            id={`note-${note.pr_number}`}
                                            className="text-2xl leading-tight font-semibold text-balance"
                                        >
                                            {note.title}
                                        </h2>
                                    </div>
                                    {Object.entries(categories).map(
                                        ([category, label]) => {
                                            const changes = note.changes.filter(
                                                (change) =>
                                                    change.category ===
                                                    category,
                                            );
                                            if (changes.length === 0) {
                                                return null;
                                            }
                                            return (
                                                <section
                                                    key={category}
                                                    className="grid gap-3"
                                                    aria-label={label}
                                                >
                                                    <div>
                                                        <Badge variant="secondary">
                                                            {label}
                                                        </Badge>
                                                    </div>
                                                    <ul className="grid list-disc gap-2 pl-5 text-sm leading-7 marker:text-muted-foreground sm:text-base">
                                                        {changes.map(
                                                            (change, index) => (
                                                                <li key={index}>
                                                                    {
                                                                        change.text
                                                                    }
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                </section>
                                            );
                                        },
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                    {notes.last_page > 1 && <Pagination links={notes.links} />}
                    <footer className="border-t border-border py-6 text-sm text-muted-foreground">
                        Crônicas Jeans · Distribuição de estoque
                    </footer>
                </div>
            </div>
        </>
    );
}
