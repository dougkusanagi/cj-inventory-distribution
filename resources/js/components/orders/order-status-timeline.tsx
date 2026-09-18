import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';

type StepState = 'done' | 'current' | 'todo' | 'canceled';

export type OrderTimelineStep = {
    label: string;
    state: StepState;
};

type OrderStatusTimelineProps = {
    status: OrderStatus;
    separated: number;
    checked: number;
    itemsCount: number;
    className?: string;
};

function clampProgress(value: number, itemsCount: number): number {
    if (itemsCount <= 0) {
        return 0;
    }

    return Math.min(Math.max(value, 0), itemsCount);
}

export function getOrderTimelineSteps(
    status: OrderStatus,
    separated: number,
    checked: number,
    itemsCount: number,
): OrderTimelineStep[] {
    const separatedCount = clampProgress(separated, itemsCount);
    const checkedCount = clampProgress(checked, itemsCount);
    const allSeparated = itemsCount > 0 && separatedCount >= itemsCount;
    const allChecked = itemsCount > 0 && checkedCount >= itemsCount;

    if (status === 'completed') {
        return [
            { label: 'Pedido criado', state: 'done' },
            { label: 'Separação', state: 'done' },
            { label: 'Conferência', state: 'done' },
            { label: 'Finalizado', state: 'done' },
        ];
    }

    if (status === 'canceled') {
        return [
            { label: 'Pedido criado', state: 'done' },
            {
                label: 'Separação',
                state: allSeparated ? 'done' : 'todo',
            },
            {
                label: 'Conferência',
                state: allChecked ? 'done' : 'todo',
            },
            { label: 'Cancelado', state: 'canceled' },
        ];
    }

    return [
        { label: 'Pedido criado', state: 'done' },
        { label: 'Separação', state: allSeparated ? 'done' : 'current' },
        {
            label: 'Conferência',
            state: allChecked ? 'done' : allSeparated ? 'current' : 'todo',
        },
        {
            label: 'Finalizado',
            state: allSeparated && allChecked ? 'current' : 'todo',
        },
    ];
}

function currentStepLabel(steps: OrderTimelineStep[]): string {
    const current = steps.find((step) => step.state === 'current');

    return current ? current.label : steps[steps.length - 1].label;
}

function TimelineDot({
    step,
    index,
}: {
    step: OrderTimelineStep;
    index: number;
}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                step.state === 'done' &&
                    'border-primary bg-primary text-primary-foreground',
                step.state === 'current' &&
                    'border-primary bg-card text-primary ring-2 ring-primary/25',
                step.state === 'todo' &&
                    'border-border bg-card text-muted-foreground',
                step.state === 'canceled' &&
                    'border-destructive bg-destructive text-white',
            )}
        >
            {step.state === 'done' ? (
                <Check className="size-4" />
            ) : step.state === 'canceled' ? (
                <X className="size-4" />
            ) : (
                index + 1
            )}
        </span>
    );
}

function HorizontalTimeline({ steps }: { steps: OrderTimelineStep[] }) {
    const reachedIndex = steps.reduce(
        (reached, step, index) => (step.state === 'todo' ? reached : index),
        0,
    );
    const progress = `${(reachedIndex / (steps.length - 1)) * 100}%`;

    return (
        <div
            className="relative hidden sm:block"
            data-testid="order-timeline-desktop"
        >
            <div
                aria-hidden="true"
                data-testid="order-timeline-track"
                className="absolute top-[13px] right-[12.5%] left-[12.5%] h-0.5 overflow-hidden rounded-full bg-border"
            >
                <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: progress }}
                />
            </div>
            <ol
                aria-label="Progresso do pedido"
                className="relative grid grid-cols-4"
            >
                {steps.map((step, index) => (
                    <li
                        key={step.label}
                        aria-current={
                            step.state === 'current' ? 'step' : undefined
                        }
                        className={cn(
                            'flex flex-col gap-2',
                            index === 0 && 'items-start text-left',
                            index > 0 &&
                                index < steps.length - 1 &&
                                'items-center text-center',
                            index === steps.length - 1 &&
                                'items-end text-right',
                        )}
                    >
                        <TimelineDot step={step} index={index} />
                        <span
                            className={cn(
                                'text-xs font-medium',
                                step.state === 'todo'
                                    ? 'text-muted-foreground'
                                    : step.state === 'canceled'
                                      ? 'text-destructive'
                                      : 'text-foreground',
                            )}
                        >
                            {step.label}
                            <span className="sr-only">
                                {step.state === 'done' && ', concluído'}
                                {step.state === 'current' && ', etapa atual'}
                                {step.state === 'todo' && ', pendente'}
                                {step.state === 'canceled' &&
                                    ', pedido cancelado'}
                            </span>
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function VerticalTimeline({ steps }: { steps: OrderTimelineStep[] }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="sm:hidden">
            <Collapsible open={open} onOpenChange={setOpen}>
                <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm text-muted-foreground">
                        Atual:{' '}
                        <strong className="font-semibold text-foreground">
                            {currentStepLabel(steps)}
                        </strong>
                    </p>
                    <CollapsibleTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid="alternar-estados"
                        >
                            {open ? 'Ocultar estados' : 'Ver estados'}
                            {open ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <ol
                        aria-label="Progresso do pedido"
                        className="grid py-3"
                        data-testid="order-timeline-mobile"
                    >
                        {steps.map((step, index) => (
                            <li
                                key={step.label}
                                aria-current={
                                    step.state === 'current'
                                        ? 'step'
                                        : undefined
                                }
                                className="flex gap-3"
                            >
                                <span
                                    aria-hidden="true"
                                    className="flex flex-col items-center"
                                >
                                    <TimelineDot step={step} index={index} />
                                    {index < steps.length - 1 && (
                                        <span
                                            className={cn(
                                                'w-0.5 flex-1 rounded-full',
                                                steps[index + 1].state !==
                                                    'todo'
                                                    ? 'bg-primary'
                                                    : 'bg-border',
                                            )}
                                        />
                                    )}
                                </span>
                                <span
                                    className={cn(
                                        'flex min-h-7 items-center gap-2',
                                        index < steps.length - 1 && 'pb-4',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'text-sm font-medium',
                                            step.state === 'todo'
                                                ? 'text-muted-foreground'
                                                : step.state === 'canceled'
                                                  ? 'text-destructive'
                                                  : 'text-foreground',
                                        )}
                                    >
                                        {step.label}
                                    </span>
                                    {step.state === 'current' && (
                                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                                            Atual
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ol>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

export function OrderStatusTimeline({
    status,
    separated,
    checked,
    itemsCount,
    className,
}: OrderStatusTimelineProps) {
    const steps = getOrderTimelineSteps(status, separated, checked, itemsCount);

    return (
        <div className={className} data-testid="order-timeline">
            <HorizontalTimeline steps={steps} />
            <VerticalTimeline steps={steps} />
        </div>
    );
}
