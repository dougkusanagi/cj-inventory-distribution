<?php

namespace App\Http\Controllers;

use App\Enums\MaterialType;
use App\Enums\MaterialUnit;
use App\Http\Requests\SaveMaterialRequest;
use App\Models\Material;
use App\Support\NormalizedSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MaterialController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Material::class);
        $search = trim($request->string('search')->toString());
        $materials = Material::query()
            ->when($search !== '', fn (Builder $query) => NormalizedSearch::apply($query, $search, ['name', 'code']))
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(20, ['id', 'name', 'code', 'type', 'unit', 'is_active'])
            ->withQueryString();

        return Inertia::render('materials/index', [
            'materials' => $materials,
            'search' => $search,
            'canEdit' => Gate::allows('create', Material::class),
            'canManageCosts' => Gate::allows('manageTechnicalCosts'),
            'types' => array_map(fn (MaterialType $type): array => ['value' => $type->value, 'label' => $type->label()], MaterialType::cases()),
            'units' => array_map(fn (MaterialUnit $unit): array => ['value' => $unit->value, 'label' => $unit->label()], MaterialUnit::cases()),
        ]);
    }

    public function store(SaveMaterialRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $material = Material::query()->create($request->validated() + ['code' => 'PENDING-'.Str::uuid()]);
            $material->update(['code' => 'INS-'.str_pad((string) $material->id, 6, '0', STR_PAD_LEFT)]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Insumo cadastrado.']);

        return back();
    }

    public function update(SaveMaterialRequest $request, Material $material): RedirectResponse
    {
        DB::transaction(fn () => $material->update($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Insumo atualizado.']);

        return back();
    }
}
