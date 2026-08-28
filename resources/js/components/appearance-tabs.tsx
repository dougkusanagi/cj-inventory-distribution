import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

type AppearanceToggleTabProps = HTMLAttributes<HTMLDivElement> & {
    collapsed?: boolean;
};

export default function AppearanceToggleTab({
    collapsed = false,
    className = '',
    ...props
}: AppearanceToggleTabProps) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'system', icon: Monitor, label: 'Sistema' },
        { value: 'light', icon: Sun, label: 'Claro' },
        { value: 'dark', icon: Moon, label: 'Escuro' },
    ];

    const handleAppearanceChange = (value: string) => {
        if (tabs.some((tab) => tab.value === value)) {
            updateAppearance(value as Appearance);
        }
    };

    if (collapsed) {
        const activeTab =
            tabs.find((tab) => tab.value === appearance) ?? tabs[0];
        const ActiveIcon = activeTab.icon;

        return (
            <div className={cn('flex justify-center', className)} {...props}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                            aria-label="Selecionar tema da interface"
                        >
                            <ActiveIcon className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="end"
                        className="min-w-40"
                    >
                        <DropdownMenuLabel>Tema da interface</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                            value={appearance}
                            onValueChange={handleAppearanceChange}
                        >
                            {tabs.map(({ value, icon: Icon, label }) => (
                                <DropdownMenuRadioItem
                                    key={value}
                                    value={value}
                                >
                                    <Icon />
                                    {label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'inline-flex w-full gap-1 rounded-lg bg-muted p-1 dark:bg-muted',
                className,
            )}
            role="group"
            aria-label="Tema da interface"
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => updateAppearance(value)}
                    aria-label={'Usar tema ' + label.toLowerCase()}
                    aria-pressed={appearance === value}
                    className={cn(
                        'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 transition-colors',
                        appearance === value
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
                    )}
                >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate text-[11px] font-medium group-data-[collapsible=icon]:hidden">
                        {label}
                    </span>
                </button>
            ))}
        </div>
    );
}
