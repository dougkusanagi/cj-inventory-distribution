<?php

namespace App\Console\Commands;

use App\Models\StockOffer;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

#[Signature('stock-offers:audit-volumes {--json : Return the report as JSON}')]
#[Description('Audit active stock offers for physical stock sacks')]
class AuditStockOfferVolumes extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $summary = [
            'offer_count' => 0,
            'offers_with_physical_volumes' => 0,
            'offers_without_physical_volumes' => 0,
            'active_offers_without_physical_volumes' => 0,
        ];
        $issues = [];

        StockOffer::query()
            ->with('stockVolumes:id,stock_offer_id,total_quantity')
            ->chunkById(100, function (Collection $offers) use (&$summary, &$issues): void {
                foreach ($offers as $offer) {
                    $summary['offer_count']++;

                    $volumes = $offer->stockVolumes;
                    $volumeCount = $volumes->count();

                    if ($volumeCount === 0) {
                        $summary['offers_without_physical_volumes']++;
                    } else {
                        $summary['offers_with_physical_volumes']++;
                    }

                    if ($offer->is_active && $volumeCount === 0) {
                        $summary['active_offers_without_physical_volumes']++;
                        $issues[] = [
                            'offer_id' => $offer->id,
                            'product_id' => $offer->product_id,
                            'issue' => 'missing_physical_volumes',
                            'volume_count' => $volumeCount,
                        ];
                    }
                }
            });

        $report = [
            'summary' => $summary,
            'issues' => $issues,
        ];

        if ($this->option('json')) {
            $this->line((string) json_encode(
                $report,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
            ));
        } else {
            $this->displayReport($summary, $issues);
        }

        return $issues === [] ? self::SUCCESS : self::FAILURE;
    }

    /**
     * Display the audit in a format useful for a release checklist.
     *
     * @param  array<string, int>  $summary
     * @param  array<int, array<string, int|string>>  $issues
     */
    private function displayReport(array $summary, array $issues): void
    {
        $this->table(
            ['Indicador', 'Quantidade'],
            [
                ['Ofertas auditadas', $summary['offer_count']],
                ['Com sacos físicos', $summary['offers_with_physical_volumes']],
                ['Sem sacos físicos', $summary['offers_without_physical_volumes']],
                ['Ativas sem sacos físicos', $summary['active_offers_without_physical_volumes']],
            ],
        );

        if ($issues === []) {
            $this->info('Auditoria concluída sem pendências.');

            return;
        }

        $this->newLine();
        $this->warn('Ofertas ativas que precisam de correção:');
        $this->table(
            ['Oferta', 'Produto', 'Problema', 'Sacos'],
            $issues,
        );
    }
}
