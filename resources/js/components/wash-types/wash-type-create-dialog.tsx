import { useHttp } from '@inertiajs/react';
import { DropIcon } from '@phosphor-icons/react';
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
        <form onSubmit={submit} className="grid">
            <div className="grid gap-3 px-6 py-6">
                <WashTypeFields
                    name={form.data.name}
                    active={true}
                    onNameChange={(name) => form.setData('name', name)}
                    onActiveChange={() => {}}
                    errors={form.errors}
                    disabled={form.processing}
                    showActive={false}
                />
                {requestError && <InputError message={requestError} />}
            </div>
            <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-border/60 bg-muted/30 px-6 py-4">
                <Button
                    type="button"
                    variant="ghost"
                    className="h-11 px-4"
                    onClick={() => changeOpen(false)}
                    disabled={form.processing}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={form.processing}
                    className="h-11 flex-1 px-5 sm:flex-none"
                >
                    {form.processing ? 'Salvando...' : 'Cadastrar lavagem'}
                </Button>
            </div>
        </form>
    );

    const title = (
        <span className="flex items-center gap-3">
            <DropIcon className="size-7 shrink-0 text-highlight" />
            <span>Novo tipo de lavagem</span>
        </span>
    );

    return isMobile ? (
        <Drawer open={open} onOpenChange={changeOpen}>
            <DrawerContent>
                <DrawerHeader className="gap-1.5 border-b border-border/60 bg-muted/30 px-6 py-4 text-left">
                    <DrawerTitle className="text-xl leading-tight">
                        {title}
                    </DrawerTitle>
                    <DrawerDescription className="leading-relaxed">
                        Cadastre a lavagem e continue de onde parou.
                    </DrawerDescription>
                </DrawerHeader>
                {quickForm}
            </DrawerContent>
        </Drawer>
    ) : (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent className="gap-0 rounded-2xl bg-card p-0 sm:max-w-md">
                <DialogHeader className="gap-1.5 rounded-t-2xl border-b border-border/60 bg-muted/30 px-6 py-4 pr-12">
                    <DialogTitle className="text-xl leading-tight">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="leading-relaxed">
                        Cadastre a lavagem e continue de onde parou.
                    </DialogDescription>
                </DialogHeader>
                {quickForm}
            </DialogContent>
        </Dialog>
    );
}
