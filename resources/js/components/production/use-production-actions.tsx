import { router, usePage } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';
import {
    advance,
    destroy,
    receive,
} from '@/actions/App/Http/Controllers/ProductionBatchController';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { PrimaryActionButton } from '@/components/production/batch-card';
import {
    BatchDrawer,
    DetailsDrawer,
    UndoDrawer,
} from '@/components/production/batch-drawers';
import { SizeGridDrawer } from '@/components/production/size-grid-drawer';
import {
    labels,
    nextStage,
    type Batch,
    type ProductionPageProps,
} from '@/components/production/types';
import {
    AdvanceWorkshopDrawer,
    ManageWorkshopsDrawer,
} from '@/components/production/workshop-drawer';

/** Valores aceitos no parâmetro `abrir`, usado pelos subitens do menu Produção. */
export type OpenPanel = 'novo-lote' | 'oficinas';

type Options = Pick<
    ProductionPageProps,
    | 'batches'
    | 'products'
    | 'maxQuantity'
    | 'workshops'
    | 'canCreate'
    | 'isAdmin'
>;

/**
 * Estado, ações e painéis do quadro de produção, compartilhados entre a
 * visão em quadro e a visão em fluxo.
 */
export function useProductionActions({
    batches,
    products,
    maxQuantity,
    workshops,
    canCreate,
    isAdmin,
}: Options) {
    const page = usePage();
    const [creating, setCreating] = useState(false);
    const [managingWorkshops, setManagingWorkshops] = useState(false);
    const [detailsId, setDetailsId] = useState<number | null>(null);
    const [undoBatch, setUndoBatch] = useState<Batch | null>(null);
    const [editingSizes, setEditingSizes] = useState<Batch | null>(null);
    const [advanceBatch, setAdvanceBatch] = useState<Batch | null>(null);
    const [confirm, setConfirm] = useState<{
        batch: Batch;
        kind: 'finish' | 'delete';
    } | null>(null);
    const [busy, setBusy] = useState<number | null>(null);
    const details = batches.find((batch) => batch.id === detailsId) ?? null;

    const openParam = new URL(page.url, 'http://localhost').searchParams.get(
        'abrir',
    );
    useEffect(() => {
        if (openParam === 'novo-lote' && canCreate) setCreating(true);
        if (openParam === 'oficinas' && isAdmin) setManagingWorkshops(true);
    }, [openParam, canCreate, isAdmin]);

    /** Remove `abrir` do endereço, para voltar no navegador não reabrir o painel. */
    function clearOpenParam() {
        if (!openParam) return;
        const url = new URL(window.location.href);
        url.searchParams.delete('abrir');
        router.get(
            url.pathname + url.search,
            {},
            { replace: true, preserveState: true, preserveScroll: true },
        );
    }

    const panelOpen = Boolean(
        creating ||
        managingWorkshops ||
        details ||
        undoBatch ||
        editingSizes ||
        confirm ||
        advanceBatch ||
        busy !== null,
    );

    function send(batch: Batch) {
        setBusy(batch.id);
        router.post(
            advance.url(batch.id),
            {
                stage: batch.stage,
                target: nextStage(batch.stage),
                version: batch.version,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(null);
                    setConfirm(null);
                },
            },
        );
    }

    function receiveBatch(batch: Batch) {
        setBusy(batch.id);
        router.post(
            receive.url(batch.id),
            { version: batch.version },
            { preserveScroll: true, onFinish: () => setBusy(null) },
        );
    }

    function primaryAction(batch: Batch) {
        const next = nextStage(batch.stage);
        if (!next) return;
        if (batch.awaiting_receipt) receiveBatch(batch);
        else if (next === 'completed') setConfirm({ batch, kind: 'finish' });
        else if (['sewing', 'washing'].includes(next)) setAdvanceBatch(batch);
        else send(batch);
    }

    const advanceTarget = advanceBatch ? nextStage(advanceBatch.stage) : null;

    const overlays: ReactNode = (
        <>
            {creating && (
                <BatchDrawer
                    products={products}
                    maxQuantity={maxQuantity}
                    onClose={() => {
                        setCreating(false);
                        clearOpenParam();
                    }}
                />
            )}
            {details && (
                <DetailsDrawer
                    batch={details}
                    onClose={() => setDetailsId(null)}
                    footer={
                        nextStage(details.stage) && (
                            <PrimaryActionButton
                                batch={details}
                                busy={busy}
                                className="h-11"
                                onClick={() => {
                                    setDetailsId(null);
                                    primaryAction(details);
                                }}
                            />
                        )
                    }
                />
            )}
            {editingSizes && (
                <SizeGridDrawer
                    batch={editingSizes}
                    maxQuantity={maxQuantity}
                    onClose={() => setEditingSizes(null)}
                />
            )}
            {undoBatch && (
                <UndoDrawer
                    batch={undoBatch}
                    onClose={() => setUndoBatch(null)}
                />
            )}
            {advanceBatch && advanceTarget && (
                <AdvanceWorkshopDrawer
                    batch={advanceBatch}
                    target={advanceTarget}
                    label={labels[advanceTarget]}
                    workshops={workshops}
                    onClose={() => setAdvanceBatch(null)}
                />
            )}
            {managingWorkshops && (
                <ManageWorkshopsDrawer
                    workshops={workshops}
                    onClose={() => {
                        setManagingWorkshops(false);
                        router.reload({ only: ['workshops'] });
                        clearOpenParam();
                    }}
                />
            )}
            <ConfirmationDialog
                open={confirm !== null}
                onOpenChange={(open) => {
                    if (!open && busy === null) setConfirm(null);
                }}
                title={
                    confirm?.kind === 'finish'
                        ? `Enviar ${confirm.batch.code} para o estoque?`
                        : `Excluir ${confirm?.batch.code}?`
                }
                description={
                    confirm?.kind === 'finish'
                        ? 'O lote vai para "Estoque" e sai do Acabamento. Os sacos não são criados automaticamente: continue cadastrando cada saco no estoque.'
                        : 'Somente lotes que nunca avançaram podem ser excluídos.'
                }
                confirmLabel={
                    confirm?.kind === 'finish'
                        ? 'Enviar para o estoque'
                        : 'Excluir lote'
                }
                destructive={confirm?.kind === 'delete'}
                disabled={busy !== null}
                onConfirm={() => {
                    if (!confirm) return;
                    if (confirm.kind === 'finish') send(confirm.batch);
                    else {
                        setBusy(confirm.batch.id);
                        router.delete(destroy.url(confirm.batch.id), {
                            data: { version: confirm.batch.version },
                            preserveScroll: true,
                            onFinish: () => {
                                setBusy(null);
                                setConfirm(null);
                            },
                        });
                    }
                }}
            />
        </>
    );

    return {
        busy,
        panelOpen,
        overlays,
        primaryAction,
        /** Props de ação do `BatchCard` para um lote. */
        cardActions: (batch: Batch) => ({
            busy,
            isAdmin,
            onOpen: () => setDetailsId(batch.id),
            onPrimary: () => primaryAction(batch),
            onEditSizes: () => setEditingSizes(batch),
            onUndo: () => setUndoBatch(batch),
            onDelete: () => setConfirm({ batch, kind: 'delete' }),
        }),
        openDetails: (batch: Batch) => setDetailsId(batch.id),
    };
}
