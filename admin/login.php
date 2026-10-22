<?php
declare(strict_types=1);
require __DIR__ . '/_inc.php';

try {
    if ((int) db()->query('SELECT COUNT(*) FROM admins')->fetchColumn() === 0) redirect('setup.php');
} catch (Throwable) {
    redirect('setup.php');
}
if (admin_id() !== null) redirect('index.php');

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $wait = login_wait_minutes();
    if ($wait > 0) {
        $error = "ใส่รหัสผิดหลายครั้งเกินไป ลองใหม่ในอีก $wait นาที";
    } else {
        $st = db()->prepare('SELECT id, password_hash FROM admins WHERE username = ?');
        $st->execute([trim((string) ($_POST['username'] ?? ''))]);
        $row = $st->fetch();
        if ($row && password_verify((string) ($_POST['password'] ?? ''), $row['password_hash'])) {
            record_login(true);
            if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
                db()->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([password_hash((string) $_POST['password'], PASSWORD_DEFAULT), $row['id']]);
            }
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int) $row['id'];
            $_SESSION['last_seen'] = time();
            db()->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = ?')->execute([$row['id']]);
            redirect('index.php');
        }
        record_login(false);
        $error = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    }
}

page_start('เข้าสู่ระบบ');
?>
<section class="card narrow">
  <h1>เข้าสู่ระบบ</h1>
  <?php if ($error): ?><p class="flash err"><?= h($error) ?></p><?php endif ?>
  <form method="post" class="stack">
    <?= csrf_field() ?>
    <label>ชื่อผู้ใช้ <input name="username" required autocomplete="username" autofocus></label>
    <label>รหัสผ่าน <input name="password" type="password" required autocomplete="current-password"></label>
    <button class="btn">เข้าสู่ระบบ</button>
  </form>
</section>
<?php page_end();
