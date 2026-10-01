<?php

use Illuminate\Support\Facades\File;
use Inertia\Testing\AssertableInertia as Assert;

test('visitors can read an empty changelog without authentication', function (): void {
    File::partialMock();
    File::shouldReceive('glob')->once()->andReturn([]);

    $this->get(route('changelog'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('changelog')
            ->has('notes.data', 0));
});

test('the changelog paginates deployed entries with the newest merge first', function (): void {
    File::partialMock();
    $paths = [];
    for ($number = 1; $number <= 16; $number++) {
        $path = resource_path('changelog/pr-'.$number.'.json');
        $paths[] = $path;
        File::shouldReceive('json')->with($path)->andReturn([
            'pr_number' => $number,
            'title' => 'Manutenção '.$number,
            'merged_at' => $number === 1 ? '2026-10-02T12:00:00Z' : '2026-10-01T12:00:00Z',
            'changes' => [
                ['category' => 'improved', 'text' => 'Atualizamos as ferramentas do sistema.'],
                ['category' => 'fixed', 'text' => 'Corrigimos a contagem das peças.'],
            ],
        ]);
    }
    File::shouldReceive('glob')->andReturn($paths);

    $this->get(route('changelog'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('changelog')
            ->has('notes.data', 15)
            ->where('notes.total', 16)
            ->where('notes.data.0.pr_number', 1)
            ->where('notes.data.1.pr_number', 16)
            ->where('notes.data.0.changes.0.category', 'improved')
            ->where('notes.data.0.changes.1.category', 'fixed'));

    $this->get(route('changelog', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('notes.data', 1)
            ->where('notes.data.0.pr_number', 2));
});
