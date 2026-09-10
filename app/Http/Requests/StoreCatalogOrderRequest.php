<?php

namespace App\Http\Requests;

use App\Http\Requests\Orders\StoreOrderRequest;

class StoreCatalogOrderRequest extends StoreOrderRequest
{
    public function authorize(): bool
    {
        return true;
    }
}
