<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ChangelogController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $entries = collect(File::json(resource_path('changelog/index.json')))
            ->map(function (array $entry): array {
                $entry['details'] = Str::markdown(File::get(resource_path('changelog/'.basename($entry['details_file']))), [
                    'html_input' => 'strip',
                    'allow_unsafe_links' => false,
                ]);

                return $entry;
            })
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
