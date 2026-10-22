<?php
// จัดการผู้ดูแลระบบ: เพิ่ม / ลบ
declare(strict_types=1);
require __DIR__ . '/_inc.php';
$me = require_login();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    if (($_POST['do'] ?? '') === 'add') {
        $user = trim((string) ($_POST['username'] ?? ''));
        if (!preg_match('/^[a-zA-Z0-9_.-]{3,50}$/', $user)) {
            $error = 'ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษหรือตัวเลข 3–50 ตัว';
        } elseif ($problem = password_problem((string) ($_POST['password'] ?? ''), (string) ($_POST['password2'] ?? ''))) {
            $error = $problem;
        } else {
            $exists = db()->prepare('SELECT COUNT(*) FROM admins WHERE username = ?');
            $exists->execute([$user]);
            if ((int) $exists->fetchColumn() > 0) {
                $error = 'มีชื่อผู้ใช้นี้แล้ว';
            } else {
                db()->prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)')->execute([$user, password_hash((string) $_POST['password'], PASSWORD_DEFAULT)]);
                audit('admin_add', "เพิ่มผู้ดูแล $user");
                flash("เพิ่มผู้ดูแล $user แล้ว");
                redirect('admins.php');
            }
        }
    } elseif (($_POST['do'] ?? '') === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        $count = (int) db()->query('SELECT COUNT(*) FROM admins')->fetchColumn();
        if ($id === $me) {
            $error = 'ลบบัญชีของตัวเองไม่ได้';
        } elseif ($count <= 1) {
            $error = 'ต้องมีผู้ดูแลอย่างน้อย 1 คน';
        } else {
            $st = db()->prepare('SELECT username FROM admins WHERE id = ?');
            $st->execute([$id]);
            if ($name = $st->fetchColumn()) {
                db()->prepare('DELETE FROM admins WHERE id = ?')->execute([$id]);
                audit('admin_delete', "ลบผู้ดูแล $name");
                flash("ลบผู้ดูแล $name แล้ว");
            }
            redirect('admins.php');
        }
    }
}

$admins = db()->query('SELECT id, username, created_at, last_login_at FROM admins ORDER BY id')->fetchAll();
page_start('ผู้ดูแล');
?>
<h1>ผู้ดูแลระบบ</h1>
<?php if ($error): ?><p class="flash err"><?= h($error) ?></p><?php endif ?>
<section class="card">
  <div class="table-wrap"><table>
    <thead><tr><th>ชื่อผู้ใช้</th><th>สร้างเมื่อ</th><th>เข้าระบบล่าสุด</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($admins as $a): ?>
      <tr>
        <td><b><?= h($a['username']) ?></b><?= (int) $a['id'] === $me ? ' <span class="pill draft">คุณ</span>' : '' ?></td>
        <td class="muted nowrap"><?= h($a['created_at']) ?></td>
        <td class="muted nowrap"><?= h($a['last_login_at'] ?? '—') ?></td>
        <td class="actions">
          <?php if ((int) $a['id'] !== $me): ?>
          <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="delete"><input type="hidden" name="id" value="<?= (int) $a['id'] ?>"><button class="btn small danger ghost">ลบ</button></form>
          <?php endif ?>
        </td>
      </tr>
    <?php endforeach ?>
    </tbody>
  </table></div>
</section>
<section class="card narrow" style="margin:0">
  <h2>เพิ่มผู้ดูแล</h2>
  <form method="post" class="stack">
    <?= csrf_field() ?><input type="hidden" name="do" value="add">
    <label>ชื่อผู้ใช้ <input name="username" required autocomplete="off" value="<?= h($_POST['username'] ?? '') ?>"></label>
    <label>รหัสผ่าน <input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
    <label>ยืนยันรหัสผ่าน <input name="password2" type="password" required minlength="8" autocomplete="new-password"></label>
    <button class="btn">เพิ่มผู้ดูแล</button>
  </form>
</section>
<?php page_end();
