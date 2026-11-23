<?php

use Illuminate\Support\Facades\Vite;

it('opens markdown details from the public update summary', function (int $width): void {
    config(['inertia.ssr.enabled' => false]);
    Vite::useHotFile(storage_path('framework/testing-hot-file'));

    visit(route('changelog', [], false))->resize($width, 844)
        ->assertSee('O que há de novo')
        ->click('article:first-of-type summary')
        ->assertVisible('article:first-of-type details[open] div')
        ->assertScript('document.documentElement.scrollWidth <= window.innerWidth')
        ->screenshot(filename: "novidades-{$width}")
        ->assertNoJavaScriptErrors();
})->with([390, 1366]);
