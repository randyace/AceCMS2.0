<?php
/**
 * Redirect API requests to api/index.php
 */
$uri = $_SERVER['REQUEST_URI'];

if (strpos($uri, '/api/') === 0) {
    include __DIR__ . '/api/index.php';
    exit;
}

// Handle image serving - /image/{id}
if (preg_match('#^/image/(\d+)$#', $uri, $matches)) {
    include __DIR__ . '/api/index.php';
    exit;
}

// Serve frontend for all other requests
header('Location: /dist/index.html');
exit;
