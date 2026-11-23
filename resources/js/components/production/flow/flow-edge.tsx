import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    useStore,
    type Edge,
    type EdgeProps,
} from '@xyflow/react';
import { pluralize } from '@/components/production/types';

export type FlowEdgeData = {
    /** Lotes enviados para a etapa de destino e ainda não recebidos. */
    batches: number;
    pieces: number;
    animate: boolean;
};

export type FlowEdgeType = Edge<FlowEdgeData, 'flow'>;

/**
 * Ligação entre duas etapas. Com lotes a receber no destino, a linha fica na
 * cor de ação, mais grossa conforme as peças em trânsito e animada no sentido
 * do fluxo.
 */
export function FlowEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
}: EdgeProps<FlowEdgeType>) {
    const [path, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });
    // Compensa o zoom afastado para o rótulo continuar legível no espaço
    // curto entre as etapas, sem crescer além do tamanho normal ao aproximar.
    const labelScale = useStore((state) =>
        Math.min(1.8, Math.max(1, 1 / state.transform[2])),
    );
    const pieces = data?.pieces ?? 0;
    const active = pieces > 0;
    const width = active ? Math.min(9, 2.5 + Math.log10(pieces + 1) * 2) : 1.5;

    return (
        <>
            <BaseEdge
                id={id}
                path={path}
                className={
                    active && data?.animate
                        ? 'production-flow-edge-animated'
                        : undefined
                }
                style={{
                    stroke: active
                        ? 'var(--action)'
                        : 'color-mix(in oklab, var(--foreground) 22%, transparent)',
                    strokeWidth: width,
                    strokeDasharray: active ? '10 8' : '4 6',
                    strokeLinecap: 'round',
                }}
            />
            {active && data?.animate && (
                <circle r={width / 2 + 2.5} fill="var(--action)">
                    <animateMotion
                        dur="2.6s"
                        repeatCount="indefinite"
                        path={path}
                    />
                </circle>
            )}
            {active && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px) scale(${labelScale})`,
                        }}
                        title={`${pluralize(data?.batches ?? 0, 'lote', 'lotes')} · ${pluralize(pieces, 'peça', 'peças')} a receber`}
                        className="pointer-events-none absolute z-10 flex flex-col items-center rounded-md border border-[color-mix(in_oklab,var(--action)_60%,var(--border))] bg-card px-2 py-1 leading-tight whitespace-nowrap text-foreground tabular-nums shadow-md"
                    >
                        <span className="text-sm font-semibold">
                            {pluralize(pieces, 'peça', 'peças')}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            {pluralize(data?.batches ?? 0, 'lote', 'lotes')} a
                            receber
                        </span>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
