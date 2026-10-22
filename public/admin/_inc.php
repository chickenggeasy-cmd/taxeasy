<?php
declare(strict_types=1);
require __DIR__ . '/../server/bootstrap.php';
require __DIR__ . '/../server/validate.php';

session_name('taxeasy_admin');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();

function admin_id(): ?int
{
    return isset($_SESSION['admin_id']) ? (int) $_SESSION['admin_id'] : null;
}

function require_login(): int
{
    $id = admin_id();
    if ($id === null) {
        header('Location: login.php');
        exit;
    }
    return $id;
}

function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . h(csrf_token()) . '">';
}

function check_csrf(): void
{
    if (!hash_equals(csrf_token(), (string) ($_POST['csrf'] ?? ''))) {
        http_response_code(400);
        exit('แบบฟอร์มหมดอายุ กรุณากลับไปหน้าก่อนแล้วลองใหม่');
    }
}

function audit(string $action, string $detail = ''): void
{
    db()->prepare('INSERT INTO audit_log (admin_id, action, detail) VALUES (?, ?, ?)')
        ->execute([admin_id(), $action, mb_substr($detail, 0, 500)]);
}

function flash(?string $msg = null, string $type = 'ok'): ?array
{
    if ($msg !== null) {
        $_SESSION['flash'] = [$type, $msg];
        return null;
    }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

function redirect(string $to): never
{
    header("Location: $to");
    exit;
}

const STATUS_LABEL = ['draft' => 'ร่าง', 'published' => 'ใช้งานอยู่', 'archived' => 'ฉบับเก่า'];

function page_start(string $title): void
{
    $f = flash();
    echo '<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>' . h($title) . ' · หลังบ้านภาษีง่ายๆ</title><link rel="stylesheet" href="admin.css"></head><body>';
    echo '<header class="top"><a class="brand" href="index.php"><span>ภ</span>หลังบ้านภาษีง่ายๆ</a>';
    if (admin_id() !== null) {
        echo '<nav><a href="../" target="_blank">เปิดแอป</a><form method="post" action="logout.php">' . csrf_field() . '<button class="link">ออกจากระบบ</button></form></nav>';
    }
    echo '</header><main>';
    if ($f) echo '<p class="flash ' . h($f[0]) . '">' . h($f[1]) . '</p>';
}

function page_end(): void
{
    echo '</main></body></html>';
}

/** แปลง JSON เป็นรายการ path → ค่า เพื่อเทียบความต่าง */
function flatten(mixed $v, string $prefix = ''): array
{
    if (!is_array($v)) return [$prefix => $v];
    if ($v === []) return [$prefix => '[]'];
    $out = [];
    foreach ($v as $k => $child) {
        $out += flatten($child, $prefix === '' ? (string) $k : "$prefix.$k");
    }
    return $out;
}

function rules_diff(array $old, array $new): array
{
    $skip = ['revision', 'updatedAt'];
    $a = flatten($old);
    $b = flatten($new);
    $rows = [];
    foreach (array_unique(array_merge(array_keys($a), array_keys($b))) as $k) {
        if (in_array(explode('.', $k)[0], $skip, true)) continue;
        $x = $a[$k] ?? null;
        $y = $b[$k] ?? null;
        if ($x === $y || ($x === '[]' && $y === null) || ($y === '[]' && $x === null)) continue;
        $rows[] = [$k, $x, $y];
    }
    return $rows;
}

function show_value(mixed $v): string
{
    if ($v === null) return '—';
    if (is_bool($v)) return $v ? 'true' : 'false';
    if (is_int($v) || is_float($v)) return number_format($v, is_float($v) && floor($v) != $v ? 2 : 0);
    return (string) $v;
}
