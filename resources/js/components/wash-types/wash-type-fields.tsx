import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function WashTypeFields({
    name,
    active,
    onNameChange,
    onActiveChange,
    errors,
    disabled = false,
    showActive = true,
}: {
    name: string;
    active: boolean;
    onNameChange: (value: string) => void;
    onActiveChange: (value: boolean) => void;
    errors: { name?: string; slug?: string; is_active?: string };
    disabled?: boolean;
    showActive?: boolean;
}) {
    return (
        <div className="grid gap-5">
            <div className="grid gap-2">
                <Label htmlFor="wash-type-name">Nome da lavagem</Label>
                <Input
                    id="wash-type-name"
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                    placeholder="Ex.: Stone wash"
                    maxLength={100}
                    autoFocus
                    disabled={disabled}
                    aria-invalid={Boolean(errors.name || errors.slug)}
                />
                <InputError message={errors.name || errors.slug} />
            </div>
            {showActive && (
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border p-4">
                    <span className="grid gap-1">
                        <span className="text-sm font-semibold">
                            Tipo de lavagem ativo
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Tipos inativos não ficam disponíveis para novas
                            seleções.
                        </span>
                    </span>
                    <Switch
                        checked={active}
                        onCheckedChange={onActiveChange}
                        disabled={disabled}
                    />
                </label>
            )}
            <InputError message={errors.is_active} />
        </div>
    );
}
