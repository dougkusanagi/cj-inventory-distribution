<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateCatalogSettingsRequest;
use App\Models\CatalogSetting;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CatalogSettingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('settings/catalog', [
            'whatsappNumber' => CatalogSetting::query()->value('whatsapp_number'),
        ]);
    }

    public function update(UpdateCatalogSettingsRequest $request): RedirectResponse
    {
        CatalogSetting::query()->updateOrCreate(
            ['id' => 1],
            $request->validated(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'WhatsApp do catálogo atualizado.']);

        return to_route('catalog-settings.edit');
    }
}
