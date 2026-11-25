export type ProductReference = {
    id: number;
    name: string;
    code: string;
    model: string | null;
};
export type SheetProduct = ProductReference & {
    wash_type: string | null;
    images: { id: number; url: string; thumb_url: string | null }[];
    archived?: boolean;
};
export type Status = 'draft' | 'in_review' | 'approved' | 'obsolete';
export const statusLabels: Record<Status, string> = {
    draft: 'Rascunho',
    in_review: 'Em revisão',
    approved: 'Aprovada',
    obsolete: 'Obsoleta',
};
export type Revision = {
    id: number;
    revision: number;
    version: number;
    status: Status;
};
export type Sheet = Revision & {
    instructions: string | null;
    review_note: string | null;
};
export type MaterialRole = 'component' | 'fabric_option';
export const materialRoleLabels: Record<MaterialRole, string> = {
    component: 'Componente',
    fabric_option: 'Opção de tecido',
};
export type MaterialLine = {
    id: number;
    material_id: number;
    material_name: string;
    role: MaterialRole;
    quantity: string;
    unit: string;
};
export type MaterialOption = {
    id: number;
    code: string;
    name: string;
    type: string;
    unit: string;
};
type Surcharge = {
    surcharge_type: 'percent' | 'fixed' | null;
    surcharge_value: string | null;
};
export type CostLine = Surcharge & {
    cost_item_id: number;
    cost_name: string;
    amount: string;
};
export type CostOption = Surcharge & {
    id: number;
    name: string;
    default_amount: string | null;
};
export type CostSummary = {
    baseTotal: string | null;
    lines: {
        id: number;
        unit_price: string | null;
        sale_price: string | null;
        material_cost: string | null;
        total: string | null;
        profit: string | null;
        margin: string | null;
    }[];
};
export type Costs = {
    items: CostLine[];
    summary: CostSummary;
    options: CostOption[];
};
