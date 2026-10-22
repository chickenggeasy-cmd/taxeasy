<?php
declare(strict_types=1);
require __DIR__ . '/_inc.php';
require_login();

$sets = db()->query('SELECT r.id, r.tax_year, r.revision, r.status, r.change_note, r.created_at, r.published_at, a.username
    FROM rule_sets r LEFT JOIN admins a ON a.id = r.created_by ORDER BY r.tax_year DESC, r.revision DESC')->fetchAll();
$byYear = [];
foreach ($sets as $s) $byYear[$s['tax_year']][] = $s;
$log = db()->query('SELECT l.action, l.detail, l.created_at, a.username FROM audit_log l LEFT JOIN admins a ON a.id = l.admin_id ORDER BY l.id DESC LIMIT 15')->fetchAll();
$aiOn = config()['ai']['api_key'] !== '';

page_start('กฎภาษี');
?>
<div class="row between">
  <div>
    <h1>กฎภาษี</h1>
    <p class="muted">แอปของผู้ใช้จะดึงฉบับ “ใช้งานอยู่” ของแต่ละปีไปใช้ทันทีที่เปิดแอป</p>
  </div>
  <?php if ($byYear): ?>
  <form method="post" action="action.php">
    <?= csrf_field() ?><input type="hidden" name="do" value="new_year">
    <button class="btn">+ สร้างปีภาษี <?= max(array_keys($byYear)) + 1 ?></button>
  </form>
  <?php endif ?>
</div>

<?php if (!$byYear): ?>
  <section class="card"><p>ยังไม่มีกฎภาษีในฐานข้อมูล นำเข้า <code>database/seed.sql</code> ผ่าน phpMyAdmin ก่อน</p></section>
<?php endif ?>

<?php foreach ($byYear as $year => $rows): ?>
<section class="card">
  <h2>ปีภาษี <?= h((string) $year) ?></h2>
  <div class="table-wrap">
  <table>
    <thead><tr><th>ฉบับที่</th><th>สถานะ</th><th>บันทึกการเปลี่ยนแปลง</th><th>สร้างเมื่อ</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($rows as $s): ?>
      <tr>
        <td class="num"><?= h((string) $s['revision']) ?></td>
        <td><span class="pill <?= h($s['status']) ?>"><?= h(STATUS_LABEL[$s['status']]) ?></span></td>
        <td><?= h($s['change_note']) ?></td>
        <td class="muted nowrap"><?= h($s['created_at']) ?><?= $s['username'] ? ' · ' . h($s['username']) : '' ?></td>
        <td class="actions">
          <a class="btn small ghost" href="edit.php?id=<?= (int) $s['id'] ?>"><?= $s['status'] === 'draft' ? 'แก้ไข' : 'ดู' ?></a>
          <?php if ($s['status'] !== 'draft'): ?>
          <form method="post" action="action.php"><?= csrf_field() ?><input type="hidden" name="do" value="new_draft"><input type="hidden" name="id" value="<?= (int) $s['id'] ?>"><button class="btn small ghost">สร้างร่างจากฉบับนี้</button></form>
          <?php endif ?>
        </td>
      </tr>
    <?php endforeach ?>
    </tbody>
  </table>
  </div>
</section>
<?php endforeach ?>

<section class="card">
  <h2>AI ผู้ช่วย</h2>
  <?php if (PHP_VERSION_ID < 80100): ?>
    <p class="flash err">AI ผู้ช่วยต้องใช้ PHP 8.1 ขึ้นไป เซิร์ฟเวอร์นี้ใช้ PHP <?= h(PHP_VERSION) ?> ส่วนอื่นของแอปใช้งานได้ตามปกติ ดูวิธีอัปเกรดใน README.md</p>
  <?php endif ?>
  <p><?= $aiOn ? '<span class="pill published">เปิดใช้งาน</span> รุ่น ' . h(config()['ai']['model']) : '<span class="pill archived">ยังไม่ได้ตั้งค่า</span> ใส่ API key ในไฟล์ <code>server/config.php</code> เพื่อเปิดใช้งาน' ?></p>
  <?php
  try {
      $u = db()->query('SELECT COUNT(*) n, COALESCE(SUM(input_tokens),0) i, COALESCE(SUM(output_tokens),0) o FROM chat_usage WHERE created_at >= NOW() - INTERVAL 30 DAY')->fetch();
      echo '<p class="muted">30 วันล่าสุด: ' . number_format((int) $u['n']) . ' ข้อความ · token เข้า ' . number_format((int) $u['i']) . ' · token ออก ' . number_format((int) $u['o']) . '</p>';
  } catch (Throwable) {
  }
  ?>
</section>

<section class="card">
  <h2>ประวัติการทำงาน</h2>
  <?php if (!$log): ?><p class="muted">ยังไม่มีรายการ</p><?php endif ?>
  <ul class="log">
  <?php foreach ($log as $l): ?>
    <li><span class="muted nowrap"><?= h($l['created_at']) ?></span> <b><?= h($l['username'] ?? 'ระบบ') ?></b> <?= h($l['detail']) ?></li>
  <?php endforeach ?>
  </ul>
</section>
<?php page_end();
