<?php
// สร้างบัญชีผู้ดูแลคนแรก (ใช้ได้เฉพาะตอนที่ยังไม่มีบัญชีเลย)
declare(strict_types=1);
require __DIR__ . '/_inc.php';

try {
    $count = (int) db()->query('SELECT COUNT(*) FROM admins')->fetchColumn();
} catch (Throwable $e) {
    page_start('ตั้งค่าครั้งแรก');
    echo '<section class="card"><h1>เชื่อมต่อฐานข้อมูลไม่ได้</h1><p>ตรวจว่าเปิด MySQL ใน XAMPP แล้ว และนำเข้า <code>database/schema.sql</code> กับ <code>database/seed.sql</code> ผ่าน phpMyAdmin แล้ว</p>';
    echo '<p class="muted">รายละเอียด: ' . h($e->getMessage()) . '</p></section>';
    page_end();
    exit;
}
if ($count > 0) redirect('login.php');

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $user = trim((string) ($_POST['username'] ?? ''));
    $pass = (string) ($_POST['password'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9_.-]{3,50}$/', $user)) {
        $error = 'ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษหรือตัวเลข 3–50 ตัว';
    } elseif (mb_strlen($pass) < 8) {
        $error = 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร';
    } elseif ($pass !== ($_POST['password2'] ?? '')) {
        $error = 'รหัสผ่านสองช่องไม่ตรงกัน';
    } else {
        db()->prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)')->execute([$user, password_hash($pass, PASSWORD_DEFAULT)]);
        session_regenerate_id(true);
        $_SESSION['admin_id'] = (int) db()->lastInsertId();
        audit('setup', "สร้างบัญชีผู้ดูแล $user");
        flash('สร้างบัญชีผู้ดูแลเรียบร้อย');
        redirect('index.php');
    }
}

page_start('ตั้งค่าครั้งแรก');
?>
<section class="card narrow">
  <h1>สร้างบัญชีผู้ดูแล</h1>
  <p class="muted">ยังไม่มีผู้ดูแลระบบ สร้างบัญชีแรกเพื่อจัดการกฎภาษี</p>
  <?php if ($error): ?><p class="flash err"><?= h($error) ?></p><?php endif ?>
  <form method="post" class="stack">
    <?= csrf_field() ?>
    <label>ชื่อผู้ใช้ <input name="username" required autocomplete="username" value="<?= h($_POST['username'] ?? 'admin') ?>"></label>
    <label>รหัสผ่าน <input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
    <label>ยืนยันรหัสผ่าน <input name="password2" type="password" required minlength="8" autocomplete="new-password"></label>
    <button class="btn">สร้างบัญชี</button>
  </form>
</section>
<?php page_end();
