<?php

namespace App\Actions\TechnicalSheets;

use App\Enums\CostSurchargeType;
use App\Enums\MaterialType;
use App\Enums\TechnicalMaterialRole;
use App\Enums\TechnicalSheetStatus as Status;
use App\Models\CostItem;
use App\Models\Material;
use App\Models\Product;
use App\Models\TechnicalSheet;
use App\Models\TechnicalSheetMaterial;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManageTechnicalSheet
{
    public function start(Product $product, User $actor, ?TechnicalSheet $source = null, ?int $version = null): TechnicalSheet
    {
        return DB::transaction(function () use ($product, $actor, $source, $version): TechnicalSheet {
            $this->lockProduct($product->id);
            $sheets = TechnicalSheet::query()->where('product_id', $product->id);

            if ((clone $sheets)->whereIn('status', [Status::Draft, Status::InReview])->exists()) {
                $this->reject('version', 'Já existe uma revisão aberta para este produto.');
            }

            $approved = (clone $sheets)->where('status', Status::Approved)->first();
            if ($source !== null && ($approved?->id !== $source->id || $approved->version !== $version)) {
                $this->reject('version', 'A revisão aprovada mudou. Atualize a página e tente novamente.');
            }
            if ($source === null && $approved !== null) {
                $this->reject('version', 'Crie a nova revisão a partir da ficha aprovada.');
            }

            $sheet = TechnicalSheet::query()->create([
                'product_id' => $product->id,
                'revision' => (int) $sheets->max('revision') + 1,
                'status' => Status::Draft,
                'version' => 1,
                'instructions' => $approved?->instructions,
                'created_by' => $actor->id,
            ]);

            if ($approved !== null) {
                foreach ($approved->materials as $line) {
                    $sheet->materials()->create($line->only(['material_id', 'material_name', 'role', 'unit', 'quantity', 'sort_order', 'sale_price']));
                }
                foreach ($approved->costs as $line) {
                    $sheet->costs()->create($line->only(['cost_item_id', 'cost_name', 'amount', 'surcharge_type', 'surcharge_value']));
                }
            }

            return $sheet;
        });
    }

    /** @param list<array{material_id:int, role:string, quantity:string|int|float}> $lines */
    public function save(TechnicalSheet $sheet, int $version, ?string $instructions, array $lines): void
    {
        $this->mutate($sheet, $version, function (TechnicalSheet $current) use ($instructions, $lines): void {
            if ($current->status !== Status::Draft) {
                $this->reject('version', 'Edite os dados técnicos quando a ficha estiver em rascunho.');
            }

            $existing = $current->materials()->get()->keyBy(fn (TechnicalSheetMaterial $line): string => $line->material_id.':'.$line->role->value);
            $materials = Material::withTrashed()->whereIn('id', array_column($lines, 'material_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $used = [];

            foreach ($lines as $index => $line) {
                $role = TechnicalMaterialRole::from($line['role']);
                $key = $line['material_id'].':'.$role->value;
                $previous = $existing->get($key);
                $material = $materials->get($line['material_id']);

                if (isset($used[$key])) {
                    $this->reject("materials.$index.material_id", 'Este insumo já foi adicionado com essa função.');
                }
                if ($previous === null && ($material === null || $material->trashed() || ! $material->is_active)) {
                    $this->reject("materials.$index.material_id", 'Escolha um insumo ativo.');
                }
                if ($previous === null && $role === TechnicalMaterialRole::FabricOption && $material->type !== MaterialType::Fabric) {
                    $this->reject("materials.$index.role", 'Escolha um tecido para usar como opção de tecido.');
                }

                $data = ['quantity' => $line['quantity'], 'sort_order' => $index];
                if ($previous !== null) {
                    $previous->update($data);
                } elseif ($material !== null) {
                    $current->materials()->create($data + [
                        'material_id' => $material->id,
                        'material_name' => $material->name,
                        'role' => $role,
                        'unit' => $material->unit,
                    ]);
                }
                $used[$key] = true;
            }

            foreach ($existing->except(array_keys($used)) as $removed) {
                $removed->delete();
            }
            $current->instructions = $instructions;
        });
    }

    /**
     * @param  list<array{cost_item_id:int, amount:string|int|float, surcharge_type?:?string, surcharge_value?:string|int|float|null}>  $costs
     * @param  list<array{id:int, sale_price:string|int|float|null}>  $sales
     */
    public function saveCosts(TechnicalSheet $sheet, int $version, array $costs, array $sales): void
    {
        $this->mutate($sheet, $version, function (TechnicalSheet $current) use ($costs, $sales): void {
            if (! $current->isOpen()) {
                $this->reject('version', 'Os custos só podem mudar enquanto a revisão estiver aberta.');
            }

            $existing = $current->costs()->get()->keyBy('cost_item_id');
            $items = CostItem::withTrashed()->whereIn('id', array_column($costs, 'cost_item_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            foreach ($costs as $index => $line) {
                $previous = $existing->get($line['cost_item_id']);
                $item = $items->get($line['cost_item_id']);
                if ($previous === null && ($item === null || $item->trashed() || ! $item->is_active)) {
                    $this->reject("costs.$index.cost_item_id", 'Escolha um custo-base ativo.');
                }
                $type = $line['surcharge_type'] ?? null;
                $amount = $line['surcharge_value'] ?? null;
                if ($type === CostSurchargeType::Percent->value && $amount > 100) {
                    $this->reject("costs.$index.surcharge_value", 'O acréscimo percentual pode ser de até 100%.');
                }
                $data = ['amount' => $line['amount'], 'surcharge_type' => $type, 'surcharge_value' => $amount];
                if ($previous !== null) {
                    $previous->update($data);
                } elseif ($item !== null) {
                    $current->costs()->create($data + ['cost_item_id' => $item->id, 'cost_name' => $item->name]);
                }
            }
            foreach ($existing->except(array_column($costs, 'cost_item_id')) as $removed) {
                $removed->delete();
            }

            $options = $current->materials()->where('role', TechnicalMaterialRole::FabricOption)->get()->keyBy('id');
            foreach ($sales as $index => $sale) {
                $option = $options->get($sale['id']);
                if ($option === null) {
                    $this->reject("sale_prices.$index.sale_price", 'A opção de tecido não pertence a esta revisão.');
                }
                $option->update(['sale_price' => $sale['sale_price']]);
            }
        });
    }

    public function transition(TechnicalSheet $sheet, int $version, Status $target, User $actor, ?string $reason): void
    {
        $this->mutate($sheet, $version, function (TechnicalSheet $current) use ($target, $actor, $reason): void {
            $allowed = match ($current->status) {
                Status::Draft => $target === Status::InReview,
                Status::InReview => $actor->isAdmin() && in_array($target, [Status::Draft, Status::Approved], true),
                Status::Approved => $actor->isAdmin() && $target === Status::Obsolete,
                Status::Obsolete => false,
            };

            if (! $allowed) {
                $this->reject('status', 'Essa mudança de situação não está disponível para a ficha.');
            }

            if ($target === Status::InReview && ! $current->materials()->exists()) {
                $this->reject('status', 'Adicione ao menos um insumo antes de enviar a ficha para revisão.');
            }

            if ($target === Status::Draft) {
                $current->review_note = $reason;
            }
            if ($target === Status::Approved) {
                $this->approve($current, $actor);
            }
            if ($target === Status::Obsolete) {
                $this->obsolete($current, $actor);
            }

            $current->status = $target;
        });
    }

    private function approve(TechnicalSheet $sheet, User $actor): void
    {
        $lines = $sheet->materials()->with('material.effectivePrice')->get();
        foreach ($lines as $line) {
            $price = $line->material?->effectivePrice?->unit_price;
            if ($price === null) {
                $this->reject('status', "Cadastre um preço vigente para {$line->material_name} antes de aprovar.");
            }
            if ($line->role === TechnicalMaterialRole::FabricOption && $line->sale_price === null) {
                $this->reject('status', "Informe o preço de venda da opção {$line->material_name}.");
            }
            $line->update(['unit_price_snapshot' => $price]);
        }

        $previous = TechnicalSheet::query()->where('product_id', $sheet->product_id)->where('status', Status::Approved)->first();
        if ($previous !== null) {
            $this->obsolete($previous, $actor);
            $previous->version++;
            $previous->save();
        }

        $sheet->fill(['approved_by' => $actor->id, 'approved_at' => now()]);
    }

    private function obsolete(TechnicalSheet $sheet, User $actor): void
    {
        $sheet->fill(['status' => Status::Obsolete, 'obsoleted_by' => $actor->id, 'obsoleted_at' => now()]);
    }

    /** @param Closure(TechnicalSheet): void $change */
    private function mutate(TechnicalSheet $sheet, int $version, Closure $change): void
    {
        DB::transaction(function () use ($sheet, $version, $change): void {
            $this->lockProduct($sheet->product_id);
            $current = TechnicalSheet::query()->whereKey($sheet->id)->lockForUpdate()->firstOrFail();
            if ($current->version !== $version) {
                $this->reject('version', 'A ficha foi alterada em outra sessão. Atualize a página antes de salvar.');
            }
            $change($current);
            $current->version++;
            $current->save();
        });
    }

    private function lockProduct(int $productId): void
    {
        Product::query()->whereKey($productId)->lockForUpdate()->firstOrFail();
    }

    private function reject(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
