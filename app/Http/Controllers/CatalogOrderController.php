<?php

namespace App\Http\Controllers;

use App\Actions\Orders\BuildOrderWhatsAppUrl;
use App\Actions\Orders\CreateOrder;
use App\Http\Requests\StoreCatalogOrderRequest;
use App\Models\CatalogSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CatalogOrderController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(
        StoreCatalogOrderRequest $request,
        CreateOrder $createOrder,
        BuildOrderWhatsAppUrl $buildOrderWhatsAppUrl,
    ): RedirectResponse {
        $destination = CatalogSetting::query()->value('whatsapp_number');

        if ($destination === null) {
            throw ValidationException::withMessages([
                'order' => 'Os pedidos pelo catálogo estão temporariamente indisponíveis. Fale com a equipe da Crônicas Jeans.',
            ]);
        }

        $order = $createOrder->handle($request->validated());
        Inertia::flash('checkout', [
            'orderCode' => $order->code,
            'whatsappUrl' => $buildOrderWhatsAppUrl->handle($order, $destination),
        ]);

        return back();
    }
}
