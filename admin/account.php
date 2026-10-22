<?php
// เปลี่ยนรหัสผ่านของตัวเอง
declare(strict_types=1);
require __DIR__ . '/_inc.php';
$me = require_login();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $st = db()->prepare('SELECT password_hash FROM admins WHERE id = ?');
    $st->execute([$me]);
    $hash = (string) $st->fetchColumn();
    $new = (string) ($_POST['new'] ?? '');
    if (!password_verify((string) ($_POST['current'] ?? ''), $hash)) {
        $error = 'รหัสผ่านปัจจุบันไม่ถูกต้อง';
    } elseif ($problem = password_problem($new, (string) ($_POST['confirm'] ?? ''))) {
        $error = $problem;
    } elseif (password_verify($new, $hash)) {
        $error = 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม';
    } else {
        db()->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), $me]);
        session_regenerate_id(true);
        audit('password', 'เปลี่ยนรหัสผ่านของตัวเอง');
        flash('เปลี่ยนรหัสผ่านแล้ว');
        redirect('account.php');
    }
}

page_start('บัญชีของฉัน');
?>
<section class="card narrow">
  <h1>เปลี่ยนรหัสผ่าน</h1>
  <p class="muted">บัญชี <b><?= h(admin_name()) ?></b></p>
  <?php if ($error): ?><p class="flash err"><?= h($error) ?></p><?php endif ?>
  <form method="post" class="stack">
    <?= csrf_field() ?>
    <label>รหัสผ่านปัจจุบัน <input name="current" type="password" required autocomplete="current-password"></label>
    <label>รหัสผ่านใหม่ <input name="new" type="password" required minlength="8" autocomplete="new-password"></label>
    <label>ยืนยันรหัสผ่านใหม่ <input name="confirm" type="password" required minlength="8" autocomplete="new-password"></label>
    <p class="muted small">อย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรและตัวเลข</p>
    <button class="btn">บันทึกรหัสผ่านใหม่</button>
  </form>
</section>
<?php page_end();
