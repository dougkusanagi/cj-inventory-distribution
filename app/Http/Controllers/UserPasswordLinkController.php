<?php

namespace App\Http\Controllers;

use App\Actions\Users\SendUserAccessLink;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class UserPasswordLinkController extends Controller
{
    public function __invoke(User $user, SendUserAccessLink $sendUserAccessLink): RedirectResponse
    {
        Gate::authorize('sendAccessLink', $user);
        $sendUserAccessLink->handle($user);

        return back();
    }
}
