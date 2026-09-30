import { Link } from '@inertiajs/react';
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type TaxonomyCardProps = {
    name: string;
    active: boolean;
    activeLabel: string;
    inactiveLabel: string;
    productsCount: number;
    editHref: React.ComponentProps<typeof Link>['href'];
    deleteDisabled: boolean;
    onDelete: () => void;
};

export function TaxonomyCard({
    name,
    active,
    activeLabel,
    inactiveLabel,
    productsCount,
    editHref,
    deleteDisabled,
    onDelete,
}: TaxonomyCardProps) {
    return (
        <Card className="flex-row items-center justify-between gap-4 rounded-2xl p-4 shadow-sm">
            <div className="grid gap-1">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{name}</h2>
                    <Badge variant={active ? 'secondary' : 'outline'}>
                        {active ? activeLabel : inactiveLabel}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    {productsCount} produtos vinculados
                </p>
            </div>
            <div className="flex gap-1">
                <Button asChild variant="ghost" size="icon">
                    <Link href={editHref} aria-label={`Editar ${name}`}>
                        <PencilSimpleIcon />
                    </Link>
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deleteDisabled}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={onDelete}
                    aria-label={`Excluir ${name}`}
                >
                    <TrashIcon />
                </Button>
            </div>
        </Card>
    );
}
