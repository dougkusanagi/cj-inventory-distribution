import { useForm } from '@inertiajs/react';
import { FloppyDiskIcon } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import {
    store,
    update,
} from '@/actions/App/Http/Controllers/WashTypeController';
import { WashTypeFields } from '@/components/wash-types/wash-type-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { WashType } from '@/types';

export function WashTypeForm({ washType }: { washType?: WashType }) {
    const form = useForm({
        name: washType?.name ?? '',
        is_active: washType?.is_active ?? true,
        ...(washType ? { _method: 'PUT' as const } : {}),
    });
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.post(washType ? update.url(washType.id) : store.url());
    }
    return (
        <form onSubmit={submit} className="grid gap-6">
            <Card>
                <CardContent className="pt-6">
                    <WashTypeFields
                        name={form.data.name}
                        active={form.data.is_active}
                        onNameChange={(value) => form.setData('name', value)}
                        onActiveChange={(value) =>
                            form.setData('is_active', value)
                        }
                        errors={form.errors}
                        disabled={form.processing}
                    />
                </CardContent>
            </Card>
            <Button
                type="submit"
                disabled={form.processing}
                className="h-11 justify-self-end"
            >
                <FloppyDiskIcon />
                {form.processing ? 'Salvando...' : 'Salvar tipo de lavagem'}
            </Button>
        </form>
    );
}
