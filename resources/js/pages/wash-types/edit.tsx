import { Head } from '@inertiajs/react';
import { WashTypeForm } from '@/components/wash-types/wash-type-form';
import { index } from '@/routes/wash-types';
import type { WashType } from '@/types';

export default function EditWashType({ washType }: { washType: WashType }) {
    return (
        <>
            <Head title={`Editar ${washType.name}`} />
            <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
                <header className="grid gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Editar tipo de lavagem
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Atualize o nome ou a disponibilidade para novos
                        produtos.
                    </p>
                </header>
                <WashTypeForm washType={washType} />
            </div>
        </>
    );
}

EditWashType.layout = {
    breadcrumbs: [
        { title: 'Tipos de lavagem', href: index() },
        { title: 'Editar tipo de lavagem', href: index() },
    ],
};
