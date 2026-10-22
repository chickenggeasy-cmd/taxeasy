<?php
declare(strict_types=1);
require __DIR__ . '/../server/bootstrap.php';
require __DIR__ . '/../server/validate.php';

// กันหน้าหลังบ้านถูกฝังในเว็บอื่น และไม่ให้เบราว์เซอร์เดาชนิดไฟล์
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

session_name('taxeasy_admin');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();

const SESSION_IDLE_SECONDS = 7200; // ออกจากระบบเองเมื่อไม่ได้ใช้ 2 ชั่วโมง
if (isset($_SESSION['admin_id'])) {
    if (time() - ($_SESSION['last_seen'] ?? time()) > SESSION_IDLE_SECONDS) {
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION['flash'] = ['err', 'ไม่ได้ใช้งานนานเกินไป กรุณาเข้าสู่ระบบใหม่'];
    } else {
        $_SESSION['last_seen'] = time();
    }
}

// ---- จำกัดการเดารหัสผ่านตาม IP ----
const LOGIN_MAX_FAILS = 5;
const LOGIN_WINDOW_MINUTES = 15;

function client_ip_hash(): string
{
    return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|taxeasy');
}

function ensure_login_table(): void
{
    db()->exec('CREATE TABLE IF NOT EXISTS login_attempts (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ip_hash CHAR(64) NOT NULL,
        success TINYINT(1) NOT NULL DEFAULT 0,
        attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_ip_time (ip_hash, attempted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
}

/** จำนวนนาทีที่ต้องรอ (0 = ลองได้) */
function login_wait_minutes(): int
{
    ensure_login_table();
    $st = db()->prepare('SELECT COUNT(*) AS n, MIN(attempted_at) AS first_at FROM login_attempts
        WHERE ip_hash = ? AND success = 0 AND attempted_at >= NOW() - INTERVAL ' . LOGIN_WINDOW_MINUTES . ' MINUTE');
    $st->execute([client_ip_hash()]);
    $row = $st->fetch();
    if ((int) $row['n'] < LOGIN_MAX_FAILS) return 0;
    $unlock = strtotime((string) $row['first_at']) + LOGIN_WINDOW_MINUTES * 60;
    return max(1, (int) ceil(($unlock - time()) / 60));
}

function record_login(bool $success): void
{
    ensure_login_table();
    db()->prepare('INSERT INTO login_attempts (ip_hash, success) VALUES (?, ?)')->execute([client_ip_hash(), $success ? 1 : 0]);
    if ($success) {
        db()->prepare('DELETE FROM login_attempts WHERE ip_hash = ? AND success = 0')->execute([client_ip_hash()]);
    }
    db()->exec('DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL 30 DAY');
}

function admin_name(): string
{
    if (admin_id() === null) return '';
    $st = db()->prepare('SELECT username FROM admins WHERE id = ?');
    $st->execute([admin_id()]);
    return (string) $st->fetchColumn();
}

/** ตรวจความแข็งแรงของรหัสผ่าน คืนข้อความผิดพลาด หรือ null ถ้าผ่าน */
function password_problem(string $pass, string $confirm): ?string
{
    if (mb_strlen($pass) < 8) return 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร';
    if (!preg_match('/[A-Za-z]/', $pass) || !preg_match('/\d/', $pass)) return 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข';
    if ($pass !== $confirm) return 'รหัสผ่านสองช่องไม่ตรงกัน';
    return null;
}

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

function redirect(string $to): void
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
    echo '<header class="top"><a class="brand" href="index.php"><img src="../icons/icon.svg" alt="" width="32" height="32">หลังบ้านภาษีง่ายๆ</a>';
    if (admin_id() !== null) {
        echo '<nav><a href="index.php">กฎภาษี</a><a href="admins.php">ผู้ดูแล</a><a href="backup.php">สำรองข้อมูล</a><a href="account.php">บัญชีของฉัน (' . h(admin_name()) . ')</a><a href="../" target="_blank">เปิดแอป</a><form method="post" action="logout.php">' . csrf_field() . '<button class="link">ออกจากระบบ</button></form></nav>';
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
