<?php

namespace App\Http\Controllers;

use App\Enums\WorkshopType;
use App\Models\ProductionBatch;
use App\Models\Workshop;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class WorkshopController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', ProductionBatch::class);
        $data = $this->validateWorkshop($request);
        try {
            $workshop = Workshop::query()->create($data + ['is_active' => true]);
        } catch (QueryException $exception) {
            $this->handleDuplicate($exception);
        }

        return response()->json($workshop, 201);
    }

    public function update(Request $request, Workshop $workshop): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        try {
            $workshop = DB::transaction(function () use ($request, $workshop): Workshop {
                $workshop = Workshop::query()->whereKey($workshop->id)->lockForUpdate()->firstOrFail();
                $data = $this->validateWorkshop($request, $workshop);
                if ($data['type'] !== $workshop->type->value && DB::table('production_batch_events')->where(fn ($query) => $query->where('from_workshop_id', $workshop->id)->orWhere('to_workshop_id', $workshop->id))->exists()) {
                    throw ValidationException::withMessages(['type' => 'Uma oficina usada em lotes não pode trocar de tipo.']);
                }
                $data['is_active'] = $request->validate(['is_active' => ['required', 'boolean']])['is_active'];
                $workshop->update($data);

                return $workshop;
            });
        } catch (QueryException $exception) {
            $this->handleDuplicate($exception);
        }

        return response()->json($workshop);
    }

    /** @return array{name: string, slug: string, type: string} */
    private function validateWorkshop(Request $request, ?Workshop $workshop = null): array
    {
        $request->merge(['name' => is_string($request->input('name')) ? Str::squish($request->input('name')) : $request->input('name')]);
        $data = $request->validate(['name' => ['required', 'string', 'max:100'], 'type' => ['required', Rule::enum(WorkshopType::class)]]);
        $slug = Str::slug($data['name']);
        if ($slug === '') {
            throw ValidationException::withMessages(['name' => 'Informe um nome válido para a oficina.']);
        }
        $exists = Workshop::query()->where('type', $data['type'])->where('slug', $slug)
            ->when($workshop, fn ($query) => $query->whereKeyNot($workshop->id))->exists();
        if ($exists) {
            throw ValidationException::withMessages(['name' => 'Já existe uma oficina com esse nome e tipo.']);
        }

        return ['name' => $data['name'], 'slug' => $slug, 'type' => $data['type']];
    }

    private function handleDuplicate(QueryException $exception): never
    {
        if ($exception->getCode() === '23505' && str_contains($exception->getMessage(), 'workshops_type_slug_unique')) {
            throw ValidationException::withMessages(['name' => 'Já existe uma oficina com esse nome e tipo.']);
        }

        throw $exception;
    }
}
