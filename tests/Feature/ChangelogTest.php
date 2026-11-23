<?php

use Illuminate\Support\Facades\File;
use Inertia\Testing\AssertableInertia as Assert;

test('visitors can read an empty changelog without authentication', function (): void {
    File::partialMock();
    File::shouldReceive('json')->with(resource_path('changelog/index.json'))->once()->andReturn([]);

    $this->get(route('changelog'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('changelog')
            ->has('notes.data', 0));
});

test('the changelog paginates deployed entries with the newest merge first', function (): void {
    File::partialMock();
    $entries = [];
    for ($number = 1; $number <= 16; $number++) {
        File::shouldReceive('get')->with(resource_path('changelog/pr-'.$number.'.md'))->andReturn('# Detalhes');
        $entries[] = [
            'id' => 'pr-'.$number,
            'details_file' => 'pr-'.$number.'.md',
            'pr_number' => $number,
            'title' => 'Manutenção '.$number,
            'merged_at' => $number === 1 ? '2026-10-02T12:00:00Z' : '2026-10-01T12:00:00Z',
            'changes' => [
                ['category' => 'improved', 'text' => 'Atualizamos as ferramentas do sistema.'],
                ['category' => 'fixed', 'text' => 'Corrigimos a contagem das peças.'],
            ],
        ];
    }
    File::shouldReceive('json')->with(resource_path('changelog/index.json'))->andReturn($entries);

    $this->get(route('changelog'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('changelog')
            ->has('notes.data', 15)
            ->where('notes.total', 16)
            ->where('notes.data.0.details', "<h1>Detalhes</h1>\n")
            ->where('notes.data.0.pr_number', 1)
            ->where('notes.data.1.pr_number', 16)
            ->where('notes.data.0.changes.0.category', 'improved')
            ->where('notes.data.0.changes.1.category', 'fixed'));

    $this->get(route('changelog', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('notes.data', 1)
            ->where('notes.data.0.pr_number', 2));
});

test('every deployed summary has a unique identifier and markdown details', function (): void {
    $entries = File::json(resource_path('changelog/index.json'));
    expect(array_unique(array_column($entries, 'id')))->toHaveCount(count($entries));
    foreach ($entries as $entry) {
        expect(File::exists(resource_path('changelog/'.$entry['details_file'])))->toBeTrue();
    }

});

test('markdown details cannot embed executable html or unsafe links', function (): void {
    File::partialMock();
    File::shouldReceive('json')->with(resource_path('changelog/index.json'))->andReturn([
        ['id' => 'safe-note', 'title' => 'Atualização', 'pr_number' => 0,
            'merged_at' => '2026-11-16T12:00:00-03:00', 'details_file' => 'safe-note.md', 'changes' => []],
    ]);
    File::shouldReceive('get')->with(resource_path('changelog/safe-note.md'))
        ->andReturn("# Detalhes\n\n<script>alert(1)</script>\n\n[Link](javascript:alert(1))");

    $this->get(route('changelog'))->assertInertia(fn (Assert $page) => $page
        ->where('notes.data.0.details', fn (string $html): bool => str_contains($html, '<h1>Detalhes</h1>')
            && ! str_contains($html, '<script>') && ! str_contains($html, 'href="javascript:')));
});
