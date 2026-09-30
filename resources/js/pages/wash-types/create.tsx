import { Head } from '@inertiajs/react';
import { WashTypeForm } from '@/components/wash-types/wash-type-form';
import { index } from '@/routes/wash-types';

export default function CreateWashType() {
    return (
        <>
            <Head title="Novo tipo de lavagem" />
            <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
                <header className="grid gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Novo tipo de lavagem
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Cadastre um tipo de lavagem para classificar os
                        produtos.
                    </p>
                </header>
                <WashTypeForm />
            </div>
        </>
    );
}

CreateWashType.layout = {
    breadcrumbs: [
        { title: 'Tipos de lavagem', href: index() },
        { title: 'Novo tipo de lavagem', href: index() },
    ],
};
