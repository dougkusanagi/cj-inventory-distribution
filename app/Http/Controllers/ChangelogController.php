<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class ChangelogController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $entries = collect(File::glob(resource_path('changelog/pr-*.json')))
            ->map(fn (string $path): array => File::json($path))
            ->sortByDesc('pr_number')
            ->sortByDesc('merged_at')
            ->values();
        $page = max(1, $request->integer('page', 1));
        $notes = new LengthAwarePaginator(
            $entries->forPage($page, 15)->values(),
            $entries->count(),
            15,
            $page,
            ['path' => $request->url()],
        );

        return Inertia::render('changelog', ['notes' => $notes]);
    }
}
