<?php

use Inertia\Testing\AssertableInertia as Assert;

test('renders the design system documentation', function () {
    $response = $this->get(route('design-system'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('design-system')
    );
});
