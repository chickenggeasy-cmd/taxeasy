<?php
declare(strict_types=1);
require __DIR__ . '/_inc.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $_SESSION = [];
    session_destroy();
}
redirect('login.php');
