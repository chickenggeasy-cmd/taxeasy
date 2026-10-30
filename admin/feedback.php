<?php
// เรื่องที่ผู้ใช้แจ้งเข้ามาจากหน้า "แจ้งปัญหา" ในแอป
declare(strict_types=1);
require __DIR__ . '/_inc.php';
require_login();
ensure_feedback_table();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $id = (int) ($_POST['id'] ?? 0);
    $do = (string) ($_POST['do'] ?? '');
    if ($do === 'done' || $do === 'reopen') {
        db()->prepare('UPDATE feedback SET status = ? WHERE id = ?')->execute([$do === 'done' ? 'done' : 'new', $id]);
        audit('feedback_' . $do, ($do === 'done' ? 'ปิดเรื่องแจ้งปัญหา #' : 'เปิดเรื่องแจ้งปัญหาอีกครั้ง #') . $id);
        flash($do === 'done' ? "ปิดเรื่อง #$id แล้ว" : "เปิดเรื่อง #$id อีกครั้งแล้ว");
    } elseif ($do === 'delete') {
        db()->prepare('DELETE FROM feedback WHERE id = ?')->execute([$id]);
        audit('feedback_delete', "ลบเรื่องแจ้งปัญหา #$id");
        flash("ลบเรื่อง #$id แล้ว");
    }
    redirect('feedback.php' . (isset($_GET['all']) ? '?all' : ''));
}

const PAGE_LABEL = [
    'summary' => 'สรุป', 'income' => 'รายได้', 'deductions' => 'ลดหย่อน', 'plan' => 'วางแผน', 'more' => 'เพิ่มเติม',
    'filing' => 'ยื่นภาษีจริง', 'market' => 'ตลาดหุ้น', 'halfyear' => 'ภ.ง.ด.94', 'privacy' => 'ความเป็นส่วนตัว',
];

$showAll = isset($_GET['all']);
$rows = db()->query('SELECT * FROM feedback' . ($showAll ? '' : " WHERE status = 'new'") . ' ORDER BY created_at DESC LIMIT 200')->fetchAll();
$counts = db()->query("SELECT status, COUNT(*) n FROM feedback GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);

page_start('แจ้งปัญหา');
?>
<div class="row between">
  <h1>เรื่องที่ผู้ใช้แจ้ง</h1>
  <p class="row small">
    <?php if ($showAll): ?><a href="feedback.php">ดูเฉพาะเรื่องใหม่ (<?= (int) ($counts['new'] ?? 0) ?>)</a>
    <?php else: ?><a href="feedback.php?all">ดูทั้งหมด (<?= (int) array_sum($counts) ?>)</a><?php endif ?>
  </p>
</div>
<p class="muted small">ผู้ใช้ส่งจากเมนู "แจ้งปัญหา" ในแอป ตัวเลขการคำนวณแนบมาเฉพาะเมื่อผู้ใช้ติ๊กยินยอม ระบบลบเรื่องที่เก่ากว่า 1 ปีให้อัตโนมัติ</p>

<?php if (!$rows): ?>
  <section class="card"><p class="muted"><?= $showAll ? 'ยังไม่มีใครแจ้งเรื่องเข้ามา' : 'ไม่มีเรื่องใหม่ค้างอยู่' ?></p></section>
<?php endif ?>

<?php foreach ($rows as $r): ?>
<section class="card stack" style="gap:10px">
  <div class="row between">
    <p class="row">
      <b>#<?= (int) $r['id'] ?></b>
      <span class="pill <?= $r['category'] === 'wrong_number' ? 'draft' : '' ?>"><?= h(FEEDBACK_CATEGORIES[$r['category']] ?? $r['category']) ?></span>
      <?= $r['status'] === 'done' ? '<span class="pill published">ปิดแล้ว</span>' : '' ?>
      <span class="muted small nowrap"><?= h($r['created_at']) ?></span>
    </p>
    <div class="row">
      <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
        <button class="btn small <?= $r['status'] === 'done' ? 'ghost' : '' ?>" name="do" value="<?= $r['status'] === 'done' ? 'reopen' : 'done' ?>"><?= $r['status'] === 'done' ? 'เปิดอีกครั้ง' : 'แก้แล้ว ปิดเรื่อง' ?></button>
      </form>
      <form method="post" onsubmit="return confirm('ลบเรื่อง #<?= (int) $r['id'] ?> ?')"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
        <button class="btn small danger ghost" name="do" value="delete">ลบ</button>
      </form>
    </div>
  </div>
  <p style="margin:0;white-space:pre-wrap"><?= h($r['message']) ?></p>
  <p class="muted small" style="margin:0">
    ปีภาษี <?= h((string) ($r['tax_year'] ?? '—')) ?> · กฎฉบับที่ <?= h((string) ($r['rules_revision'] ?? '—')) ?>
    <?= $r['page'] !== '' ? ' · ส่งจากหน้า ' . h(PAGE_LABEL[$r['page']] ?? $r['page']) : '' ?>
    <?= $r['contact'] !== '' ? ' · ติดต่อกลับ: <b>' . h($r['contact']) . '</b>' : '' ?>
  </p>
  <?php if ($r['calc_summary']): ?>
    <details><summary class="small">ตัวเลขที่ผู้ใช้แนบมา</summary><pre class="small" style="white-space:pre-wrap;margin:8px 0 0;background:var(--paper);padding:10px;border-radius:10px"><?= h($r['calc_summary']) ?></pre></details>
  <?php endif ?>
</section>
<?php endforeach ?>
<?php page_end();
