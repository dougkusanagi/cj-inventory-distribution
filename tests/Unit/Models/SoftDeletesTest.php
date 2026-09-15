<?php

use App\Models\CatalogSetting;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use App\Models\User;
use Illuminate\Database\Eloquent\SoftDeletes;

test('soft-deletable application entities use soft deletes', function (string $model): void {
    expect(class_uses_recursive($model))->toContain(SoftDeletes::class);
})->with([
    CatalogSetting::class,
    Category::class,
    Order::class,
    OrderItem::class,
    Product::class,
    StockOffer::class,
    StockOfferVolume::class,
    StockOfferVolumeItem::class,
    User::class,
]);
