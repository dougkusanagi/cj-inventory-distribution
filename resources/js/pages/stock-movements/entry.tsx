import { Head } from '@inertiajs/react';
import { ArrowDownToLine } from 'lucide-react';
import { StockEntryForm } from '@/components/products/stock-entry-form';
import { index } from '@/routes/stock-movements';

type EntryProduct = {
    id: number;
    code: string;
    name: string;
    model: string | null;
    category: string | null;
};

export default function StockEntry({
    products,
    selectedProductId,
}: {
    products: EntryProduct[];
    selectedProductId: number | null;
}) {
    return (
        <>
            <Head title="Registrar entrada" />
            <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <header className="flex items-start gap-3">
                    <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <ArrowDownToLine className="size-5" />
                    </span>
                    <div className="grid gap-1.5">
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Registrar entrada de estoque
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            Registre os sacos recebidos e informe a
                            classificação deste estoque.
                        </p>
                    </div>
                </header>

                <StockEntryForm
                    products={products}
                    selectedProductId={selectedProductId}
                />
            </div>
        </>
    );
}

StockEntry.layout = {
    breadcrumbs: [
        { title: 'Histórico de estoque', href: index() },
        { title: 'Nova entrada', href: index() },
    ],
};
