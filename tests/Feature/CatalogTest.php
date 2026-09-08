<?php

use Inertia\Testing\AssertableInertia as Assert;

test('renders the public catalog prototype', function () {
    $response = $this->get(route('catalog'));

    $response->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('catalog')
    );
});
