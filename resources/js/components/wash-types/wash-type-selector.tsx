import { useState } from 'react';
import InputError from '@/components/input-error';
import { WashTypeCreateDialog } from '@/components/wash-types/wash-type-create-dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { WashType } from '@/types';

export function WashTypeSelector({
    washTypes,
    value,
    onValueChange,
    error,
    disabled,
}: {
    washTypes: WashType[];
    value: string;
    onValueChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [initialName, setInitialName] = useState('');
    const [createdTypes, setCreatedTypes] = useState<WashType[]>([]);
    const options = Array.from(
        new Map(
            [...washTypes, ...createdTypes].map((type) => [type.id, type]),
        ).values(),
    ).map((type) => ({
        value: type.id.toString(),
        label: type.name + (type.is_active ? '' : ' (inativo)'),
    }));
    return (
        <div className="grid gap-2">
            <Label htmlFor="product-wash-type">Tipo de lavagem</Label>
            <div className="flex min-w-0 gap-2">
                <SearchableSelect
                    id="product-wash-type"
                    label="Tipo de lavagem"
                    value={value || 'none'}
                    options={[
                        { value: 'none', label: 'Sem lavagem informada' },
                        ...options,
                    ]}
                    onValueChange={(next) =>
                        onValueChange(next === 'none' ? '' : next)
                    }
                    onCreate={(search) => {
                        setInitialName(search);
                        setOpen(true);
                    }}
                    createLabel="Cadastrar tipo de lavagem"
                    disabled={disabled}
                    invalid={Boolean(error)}
                    className="flex-1"
                />
            </div>
            <InputError message={error} />
            <WashTypeCreateDialog
                key={String(open)}
                open={open}
                initialName={initialName}
                onOpenChange={setOpen}
                onCreated={(created) => {
                    setCreatedTypes((current) => [...current, created]);
                    onValueChange(created.id.toString());
                }}
            />
        </div>
    );
}
