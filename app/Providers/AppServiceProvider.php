<?php

namespace App\Providers;

use App\Models\CatalogSetting;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockOffer;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use App\Models\User;
use App\Observers\ModelAuditObserver;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        $observer = new ModelAuditObserver;

        foreach ([
            Product::class,
            Category::class,
            StockOffer::class,
            StockOfferVolume::class,
            StockOfferVolumeItem::class,
            CatalogSetting::class,
            User::class,
        ] as $model) {
            $model::observe($observer);
        }
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
