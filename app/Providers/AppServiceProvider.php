<?php

namespace App\Providers;

use App\Models\CatalogSetting;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockOfferVolume;
use App\Models\StockOfferVolumeItem;
use App\Models\User;
use App\Models\WashType;
use App\Observers\ModelAuditObserver;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(ModelAuditObserver::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        RateLimiter::for('catalog-orders', fn (Request $request): array => [
            Limit::perMinute(10)->by('catalog-minute:'.$request->ip()),
            Limit::perHour(30)->by('catalog-hour:'.$request->ip()),
            Limit::perHour(10)->by('catalog-session:'.$request->session()->getId()),
        ]);

        foreach ([
            Product::class,
            Category::class,
            WashType::class,
            StockOfferVolume::class,
            StockOfferVolumeItem::class,
            CatalogSetting::class,
            User::class,
        ] as $model) {
            $model::observe(ModelAuditObserver::class);
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
