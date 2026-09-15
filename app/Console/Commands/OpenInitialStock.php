<?php

namespace App\Console\Commands;

use App\Actions\Stock\OpenInitialStock as OpenInitialStockAction;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('stock:open-initial {--key= : Chave idempotente da abertura inicial} {--actor= : ID do usuário responsável}')]
#[Description('Registra o estoque físico atual como abertura inicial')]
class OpenInitialStock extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(OpenInitialStockAction $openInitialStock): int
    {
        $key = $this->option('key');

        if (! is_string($key) || trim($key) === '') {
            $this->error('Informe --key para que a abertura inicial possa ser repetida com segurança.');

            return self::FAILURE;
        }

        $actor = null;
        $actorId = $this->option('actor');

        if (is_numeric($actorId)) {
            $actor = User::query()->find((int) $actorId);

            if ($actor === null) {
                $this->error('O usuário informado em --actor não existe.');

                return self::FAILURE;
            }
        }

        $movement = $openInitialStock->handle(null, trim($key), $actor);
        $this->info("Abertura inicial registrada na movimentação #{$movement->id} com {$movement->items()->count()} saco(s).");

        return self::SUCCESS;
    }
}
