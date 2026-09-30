import { useHttp } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { store } from '@/actions/App/Http/Controllers/WashTypeController';
import InputError from '@/components/input-error';
import { WashTypeFields } from '@/components/wash-types/wash-type-fields';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import type { WashType } from '@/types';

export function WashTypeCreateDialog({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (washType: WashType) => void;
}) {
    const [requestError, setRequestError] = useState('');
    const isMobile = useIsMobile();
    const form = useHttp<{ name: string; is_active: boolean }, WashType>({
        name: '',
        is_active: true,
    });

    function changeOpen(next: boolean) {
        if (form.processing) {
            return;
        }
        onOpenChange(next);
        if (next) {
            form.resetAndClearErrors();
            setRequestError('');
        }
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        event.stopPropagation();
        setRequestError('');
        try {
            const created = await form.post(store.url());
            if (!created) {
                return;
            }
            onCreated(created);
            onOpenChange(false);
            toast.success('Tipo de lavagem cadastrado.', {
                position: 'top-center',
            });
        } catch {
            setRequestError('Não foi possível cadastrar. Tente novamente.');
        }
    }

    const quickForm = (
        <form onSubmit={submit} className="grid gap-5 p-4 pt-0 sm:p-0">
            <WashTypeFields
                name={form.data.name}
                active={true}
                onNameChange={(name) => form.setData('name', name)}
                onActiveChange={() => {}}
                errors={form.errors}
                disabled={form.processing}
                showActive={false}
            />
            <InputError message={requestError} />
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => changeOpen(false)}
                    disabled={form.processing}
                >
                    Cancelar
                </Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Salvando...' : 'Cadastrar lavagem'}
                </Button>
            </div>
        </form>
    );

    return isMobile ? (
        <Drawer open={open} onOpenChange={changeOpen}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Novo tipo de lavagem</DrawerTitle>
                    <DrawerDescription>
                        Cadastre a lavagem e continue de onde parou.
                    </DrawerDescription>
                </DrawerHeader>
                {quickForm}
            </DrawerContent>
        </Drawer>
    ) : (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Novo tipo de lavagem</DialogTitle>
                    <DialogDescription>
                        Cadastre a lavagem e continue de onde parou.
                    </DialogDescription>
                </DialogHeader>
                {quickForm}
            </DialogContent>
        </Dialog>
    );
}
