<?php

namespace App\Observers;

use App\Enums\AuditAction;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Arr;

class ModelAuditObserver
{
    /** @var array<int, array<string, mixed>> */
    private array $before = [];

    public function created(Model $model): void
    {
        $this->record($model, AuditAction::Created, null, $this->snapshot($model->getAttributes()));
    }

    public function updating(Model $model): void
    {
        $this->before[spl_object_id($model)] = $this->snapshot($model->getRawOriginal());
    }

    public function updated(Model $model): void
    {
        $modelId = spl_object_id($model);
        $before = $this->before[$modelId] ?? $this->snapshot($model->getRawOriginal());
        $changedKeys = array_keys($model->getChanges());
        $after = Arr::only($this->snapshot($model->getAttributes()), $changedKeys);
        $before = Arr::only($before, $changedKeys);

        unset($this->before[$modelId]);

        if ($before === $after) {
            return;
        }

        $this->record($model, AuditAction::Updated, $before, $after);
    }

    public function deleting(Model $model): void
    {
        $this->before[spl_object_id($model)] = $this->snapshot($model->getRawOriginal());
    }

    public function deleted(Model $model): void
    {
        $modelId = spl_object_id($model);
        $action = in_array(SoftDeletes::class, class_uses_recursive($model), true)
            && method_exists($model, 'isForceDeleting')
            && $model->isForceDeleting()
            ? AuditAction::ForceDeleted
            : AuditAction::Deleted;

        $before = $this->before[$modelId] ?? null;
        unset($this->before[$modelId]);

        $this->record($model, $action, $before, $this->snapshot($model->getAttributes()));
    }

    public function restoring(Model $model): void
    {
        $this->before[spl_object_id($model)] = $this->snapshot($model->getRawOriginal());
    }

    public function restored(Model $model): void
    {
        $modelId = spl_object_id($model);
        $before = $this->before[$modelId] ?? null;
        unset($this->before[$modelId]);

        $this->record($model, AuditAction::Restored, $before, $this->snapshot($model->getAttributes()));
    }

    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    private function record(Model $model, AuditAction $action, ?array $before, ?array $after): void
    {
        AuditLog::create([
            'auditable_type' => $model->getMorphClass(),
            'auditable_id' => $model->getKey(),
            'action' => $action,
            'actor_id' => $this->actorId(),
            'before' => $before,
            'after' => $after,
            'context' => $this->context(),
            'occurred_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function snapshot(array $attributes): array
    {
        $sensitiveKeys = [
            'password',
            'remember_token',
            'two_factor_secret',
            'two_factor_recovery_codes',
            'token',
            'tokens',
            'secret',
            'secrets',
            'api_key',
            'api_secret',
            'recovery_codes',
        ];

        return $this->sanitize($attributes, $sensitiveKeys);
    }

    /**
     * @param  array<string, mixed>  $values
     * @param  array<int, string>  $sensitiveKeys
     * @return array<string, mixed>
     */
    private function sanitize(array $values, array $sensitiveKeys): array
    {
        $sanitized = [];

        foreach ($values as $key => $value) {
            if (in_array(strtolower((string) $key), $sensitiveKeys, true)) {
                continue;
            }

            $sanitized[$key] = is_array($value)
                ? $this->sanitize($value, $sensitiveKeys)
                : $value;
        }

        return $sanitized;
    }

    private function actorId(): ?int
    {
        $actorId = auth()->id();

        return is_numeric($actorId) ? (int) $actorId : null;
    }

    /** @return array<string, string|null>|null */
    private function context(): ?array
    {
        if (! app()->bound('request')) {
            return null;
        }

        $request = request();

        return [
            'method' => $request->method(),
            'path' => $request->path(),
            'ip' => $request->ip(),
        ];
    }
}
