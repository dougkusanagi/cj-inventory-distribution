<?php

namespace App\Http\Controllers;

use App\Actions\Users\CreateUserAccount;
use App\Actions\Users\SendUserAccessLink;
use App\Actions\Users\UpdateUserAccount;
use App\Enums\ProductionStage;
use App\Enums\UserRole;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);
        $search = trim($request->string('search')->toString());
        $role = $request->string('role')->toString();
        $status = $request->string('status', 'all')->toString();
        $users = User::query()
            ->select(['id', 'name', 'email', 'role', 'is_active', 'email_verified_at', 'created_at'])
            ->when($search !== '', fn (Builder $query) => $query->where(fn (Builder $query) => $query->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%')))
            ->when(in_array($role, array_column(UserRole::cases(), 'value'), true), fn (Builder $query) => $query->where('role', $role))
            ->when(in_array($status, ['active', 'inactive'], true), fn (Builder $query) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')->orderBy('id')->paginate(15)->withQueryString();

        $stagesByUser = DB::table('production_stage_user')->whereNull('deleted_at')->whereIn('user_id', $users->getCollection()->modelKeys())->get()->groupBy('user_id');
        $users->getCollection()->each(fn (User $user) => $user->setAttribute('production_stages', $stagesByUser->get($user->id, collect())->pluck('stage')->all()));

        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => ['search' => $search, 'role' => $role, 'status' => $status],
            'productionStages' => array_map(fn (ProductionStage $stage): array => ['value' => $stage->value, 'label' => $stage->label()], ProductionStage::cases()),
            'roles' => array_map(fn (UserRole $role): array => ['value' => $role->value, 'label' => $role->label()], UserRole::cases()),
        ]);
    }

    public function store(StoreUserRequest $request, CreateUserAccount $createUserAccount, SendUserAccessLink $sendUserAccessLink): RedirectResponse
    {
        $user = $createUserAccount->handle([
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'role' => $request->string('role')->toString(),
            'production_stages' => $request->validated('production_stages', []),
        ], $request->user());
        $sendUserAccessLink->handle($user, created: true);

        return to_route('users.index');
    }

    public function update(UpdateUserRequest $request, User $user, UpdateUserAccount $updateUserAccount): RedirectResponse
    {
        $updateUserAccount->handle($user, [
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'role' => $request->string('role')->toString(),
            'production_stages' => $request->validated('production_stages', []),
            'is_active' => $request->boolean('is_active'),
        ], $request->user());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Conta atualizada.']);

        return back();
    }
}
