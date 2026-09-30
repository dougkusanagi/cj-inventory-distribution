<?php

namespace App\Http\Controllers;

use App\Http\Requests\WashTypes\WashTypeRequest;
use App\Models\WashType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class WashTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', WashType::class);
        $search = trim($request->string('search')->toString());

        $washTypes = WashType::query()
            ->withCount(['products' => fn ($query) => $query->withTrashed()])
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('wash-types/index', [
            'washTypes' => $washTypes,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        Gate::authorize('create', WashType::class);

        return Inertia::render('wash-types/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(WashTypeRequest $request): RedirectResponse|JsonResponse
    {
        Gate::authorize('create', WashType::class);
        $washType = WashType::create($request->validated());

        if ($request->expectsJson()) {
            return response()->json($washType, 201);
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tipo de lavagem cadastrado.']);

        return to_route('wash-types.index');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(WashType $washType): Response
    {
        Gate::authorize('update', $washType);

        return Inertia::render('wash-types/edit', ['washType' => $washType]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(WashTypeRequest $request, WashType $washType): RedirectResponse
    {
        Gate::authorize('update', $washType);
        $washType->update($request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tipo de lavagem atualizado.']);

        return to_route('wash-types.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(WashType $washType): RedirectResponse
    {
        Gate::authorize('delete', $washType);

        if ($washType->products()->withTrashed()->exists()) {
            throw ValidationException::withMessages([
                'washType' => 'Tipo de lavagem em uso. Desative ou reclassifique os produtos.',
            ]);
        }

        $washType->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tipo de lavagem excluído.']);

        return to_route('wash-types.index');
    }
}
