<?php
declare(strict_types=1);

mb_internal_encoding('UTF-8');

function config(): array
{
    static $config = null;
    if ($config === null) {
        $local = __DIR__ . '/config.local.php';
        $config = require (is_file($local) ? $local : __DIR__ . '/config.php');
    }
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config()['db'];
        $dsn = "mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

/** กฎฉบับที่ใช้งานอยู่ (published ล่าสุด) ของทุกปี */
function published_rules(): array
{
    $rows = db()->query(
        "SELECT r.rules_json FROM rule_sets r
         JOIN (SELECT tax_year, MAX(revision) AS rev FROM rule_sets WHERE status = 'published' GROUP BY tax_year) p
           ON p.tax_year = r.tax_year AND p.rev = r.revision
         ORDER BY r.tax_year"
    )->fetchAll();
    return array_map(fn($r) => json_decode($r['rules_json'], true), $rows);
}
