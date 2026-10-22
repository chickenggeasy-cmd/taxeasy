<?php
declare(strict_types=1);
require __DIR__ . '/_inc.php';
require_login();

$st = db()->prepare('SELECT * FROM rule_sets WHERE id = ?');
$st->execute([(int) ($_GET['id'] ?? 0)]);
$row = $st->fetch();
if (!$row) {
    flash('ไม่พบกฎฉบับนี้', 'err');
    redirect('index.php');
}
$rules = json_decode($row['rules_json'], true);
$editable = $row['status'] === 'draft';
$raw = isset($_GET['raw']);

// ชื่อภาษาไทยของแต่ละช่อง
const LABELS = [
    'notes' => 'คำอธิบายกฎปีนี้',
    'filingDeadlines.paper' => 'กำหนดยื่นแบบกระดาษ (พ.ศ. YYYY-MM-DD)',
    'filingDeadlines.online' => 'กำหนดยื่นออนไลน์ (พ.ศ. YYYY-MM-DD)',
    'minimumTax.rate' => 'วิธี 0.5%: อัตรา',
    'minimumTax.incomeThreshold' => 'วิธี 0.5%: ใช้เมื่อเงินได้ 40(2)–(8) ตั้งแต่',
    'minimumTax.exemptIfNotExceed' => 'วิธี 0.5%: ยกเว้นถ้าภาษีไม่เกิน',
    'elderlyExemption' => 'ยกเว้นเงินได้ผู้สูงอายุ 65+/ผู้พิการ',
    'expenses.employment.rate' => '40(1)(2) หักค่าใช้จ่าย: อัตรา',
    'expenses.employment.max' => '40(1)(2) หักค่าใช้จ่าย: สูงสุด',
    'expenses.royalty.rate' => '40(3) ลิขสิทธิ์: อัตรา',
    'expenses.royalty.max' => '40(3) ลิขสิทธิ์: สูงสุด',
    'expenses.rent.building' => '40(5) ค่าเช่าบ้าน/อาคาร',
    'expenses.rent.agriLand' => '40(5) ค่าเช่าที่ดินเกษตร',
    'expenses.rent.otherLand' => '40(5) ค่าเช่าที่ดินอื่น',
    'expenses.rent.vehicle' => '40(5) ค่าเช่ายานพาหนะ',
    'expenses.rent.other' => '40(5) ค่าเช่าทรัพย์สินอื่น',
    'expenses.professional.medical' => '40(6) ประกอบโรคศิลปะ',
    'expenses.professional.other' => '40(6) วิชาชีพอื่น',
    'expenses.contract.rate' => '40(7) รับเหมา',
    'expenses.business.rate' => '40(8) ธุรกิจ/อื่น ๆ',
    'deductions.personal' => 'ส่วนตัว',
    'deductions.spouse' => 'คู่สมรสไม่มีเงินได้',
    'deductions.child' => 'บุตร (ต่อคน)',
    'deductions.childSecondPlusBornFrom2561' => 'บุตรคนที่ 2+ เกิดตั้งแต่ 2561',
    'deductions.parent' => 'บิดามารดา (ต่อคน)',
    'deductions.disabledCare' => 'อุปการะผู้พิการ (ต่อคน)',
    'deductions.prenatal' => 'ฝากครรภ์และคลอดบุตร',
    'deductions.socialSecurity' => 'ประกันสังคม',
    'deductions.lifeInsurance' => 'ประกันชีวิต',
    'deductions.healthInsurance' => 'ประกันสุขภาพตนเอง',
    'deductions.lifeHealthCombined' => 'ประกันชีวิต + สุขภาพ รวมกันไม่เกิน',
    'deductions.spouseLifeInsurance' => 'ประกันชีวิตคู่สมรส',
    'deductions.parentHealthInsurance' => 'ประกันสุขภาพบิดามารดา',
    'deductions.pensionInsurance.rate' => 'ประกันบำนาญ: % ของเงินได้',
    'deductions.pensionInsurance.max' => 'ประกันบำนาญ: สูงสุด',
    'deductions.pvd.rate' => 'PVD: % ของค่าจ้าง',
    'deductions.pvd.max' => 'PVD: สูงสุด',
    'deductions.gpf.rate' => 'กบข.: % ของค่าจ้าง',
    'deductions.gpf.max' => 'กบข.: สูงสุด',
    'deductions.nsf' => 'กอช.',
    'deductions.rmf.rate' => 'RMF: % ของเงินได้',
    'deductions.rmf.max' => 'RMF: สูงสุด',
    'deductions.ssf' => 'SSF (ว่าง = ไม่มีสิทธิ)',
    'deductions.ssf.rate' => 'SSF: % ของเงินได้',
    'deductions.ssf.max' => 'SSF: สูงสุด',
    'deductions.retirementCombined' => 'กลุ่มเกษียณรวมกันไม่เกิน',
    'deductions.thaiEsg' => 'ThaiESG (ว่าง = ไม่มีสิทธิ)',
    'deductions.thaiEsg.rate' => 'ThaiESG: % ของเงินได้',
    'deductions.thaiEsg.max' => 'ThaiESG: สูงสุด',
    'deductions.thaiEsgxLtf' => 'ThaiESGX ส่วนสับเปลี่ยนจาก LTF (0 = ไม่มี)',
    'deductions.homeLoanInterest' => 'ดอกเบี้ยบ้าน',
    'deductions.socialEnterprise' => 'ลงทุนวิสาหกิจเพื่อสังคม',
    'deductions.politicalDonation' => 'บริจาคพรรคการเมือง',
    'deductions.donationCapRate' => 'เพดานเงินบริจาค (สัดส่วนของเงินได้)',
];
const JSON_SECTIONS = ['brackets' => 'ขั้นบันไดภาษี', 'measures' => 'มาตรการพิเศษรายปี', 'sources' => 'แหล่งอ้างอิง'];
const JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT;

function set_path(array &$arr, string $path, mixed $value): void
{
    $ref = &$arr;
    foreach (explode('.', $path) as $k) $ref = &$ref[$k];
    $ref = $value;
}

$errors = [];
$jsonText = [];
if ($editable && $_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $new = $rules;
    if (isset($_POST['raw_json'])) {
        $new = json_decode((string) $_POST['raw_json'], true);
        if (!is_array($new)) $errors[] = 'JSON ไม่ถูกต้อง: ' . json_last_error_msg();
        $jsonText['raw'] = (string) $_POST['raw_json'];
    } else {
        $flat = flatten($rules);
        foreach ((array) ($_POST['f'] ?? []) as $path => $val) {
            $path = str_replace('__', '.', (string) $path);
            if (!array_key_exists($path, $flat) || !isset(LABELS[$path])) continue;
            $val = trim((string) $val);
            $old = $flat[$path];
            if (is_int($old) || is_float($old)) {
                if (!is_numeric($val)) {
                    $errors[] = (LABELS[$path]) . ' ต้องเป็นตัวเลข';
                    continue;
                }
                $val = $val + 0;
            } elseif ($old === null) {
                if ($val !== '') $errors[] = LABELS[$path] . ': เปิดสิทธินี้ได้ในโหมดแก้ JSON';
                continue;
            }
            set_path($new, $path, $val);
        }
        foreach (JSON_SECTIONS as $key => $label) {
            $text = (string) ($_POST["json_$key"] ?? '');
            $jsonText[$key] = $text;
            $decoded = json_decode($text, true);
            if (!is_array($decoded)) $errors[] = "$label: JSON ไม่ถูกต้อง (" . json_last_error_msg() . ')';
            else $new[$key] = $decoded;
        }
    }
    if (!$errors) {
        $new['revision'] = (int) $row['revision'];
        $errors = validate_rules($new, (int) $row['tax_year']);
    }
    if (!$errors) {
        $note = mb_substr(trim((string) ($_POST['change_note'] ?? '')), 0, 500);
        db()->prepare("UPDATE rule_sets SET rules_json = ?, change_note = ? WHERE id = ? AND status = 'draft'")
            ->execute([json_encode($new, JSON_FLAGS), $note, $row['id']]);
        audit('save', "บันทึกร่างปี {$row['tax_year']} ฉบับที่ {$row['revision']}");
        flash('บันทึกร่างแล้ว');
        redirect("edit.php?id={$row['id']}" . ($raw ? '&raw=1' : ''));
    }
}

// เทียบกับฉบับที่ใช้งานอยู่
$st = db()->prepare("SELECT rules_json, revision FROM rule_sets WHERE tax_year = ? AND status = 'published' AND id <> ? ORDER BY revision DESC LIMIT 1");
$st->execute([$row['tax_year'], $row['id']]);
$pub = $st->fetch();
$diff = $pub ? rules_diff(json_decode($pub['rules_json'], true), $rules) : [];
$problems = validate_rules($rules, (int) $row['tax_year']);

page_start("กฎปี {$row['tax_year']} ฉบับที่ {$row['revision']}");
$ro = $editable ? '' : ' disabled';
?>
<p><a href="index.php">← กลับ</a></p>
<div class="row between">
  <div>
    <h1>ปีภาษี <?= h((string) $row['tax_year']) ?> · ฉบับที่ <?= h((string) $row['revision']) ?></h1>
    <p><span class="pill <?= h($row['status']) ?>"><?= h(STATUS_LABEL[$row['status']]) ?></span></p>
  </div>
  <?php if ($editable): ?>
  <div class="row">
    <a class="btn small ghost" href="edit.php?id=<?= (int) $row['id'] ?><?= $raw ? '' : '&raw=1' ?>"><?= $raw ? 'แก้แบบฟอร์ม' : 'แก้แบบ JSON ทั้งหมด' ?></a>
  </div>
  <?php endif ?>
</div>

<?php if ($errors): ?>
  <div class="flash err"><b>ยังบันทึกไม่ได้</b><ul><?php foreach ($errors as $e) echo '<li>' . h($e) . '</li>' ?></ul></div>
<?php endif ?>

<?php if ($editable): ?>
<section class="card">
  <h2>ก่อนเผยแพร่</h2>
  <?php if ($pub): ?>
    <?php if ($diff): ?>
      <p>เปลี่ยนจากฉบับที่ใช้งานอยู่ (ฉบับที่ <?= (int) $pub['revision'] ?>) <?= count($diff) ?> จุด</p>
      <div class="table-wrap"><table>
        <thead><tr><th>ช่อง</th><th>เดิม</th><th>ใหม่</th></tr></thead>
        <tbody><?php foreach ($diff as [$k, $a, $b]): ?>
          <tr><td><?= h(LABELS[$k] ?? $k) ?></td><td class="num old"><?= h(show_value($a)) ?></td><td class="num new"><?= h(show_value($b)) ?></td></tr>
        <?php endforeach ?></tbody>
      </table></div>
    <?php else: ?>
      <p class="muted">ยังไม่มีอะไรต่างจากฉบับที่ใช้งานอยู่</p>
    <?php endif ?>
  <?php else: ?>
    <p class="muted">ปีนี้ยังไม่มีฉบับที่ใช้งาน ร่างนี้จะเป็นฉบับแรก</p>
  <?php endif ?>
  <?php if ($problems): ?>
    <p class="flash err">ต้องแก้ก่อนเผยแพร่: <?= h(implode(' · ', $problems)) ?></p>
  <?php endif ?>
  <div class="row">
    <form method="post" action="action.php"><?= csrf_field() ?><input type="hidden" name="do" value="publish"><input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
      <button class="btn"<?= $problems ? ' disabled' : '' ?>>เผยแพร่ให้ผู้ใช้</button></form>
    <form method="post" action="action.php"><?= csrf_field() ?><input type="hidden" name="do" value="delete"><input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
      <button class="btn danger ghost">ลบร่างนี้</button></form>
  </div>
  <p class="muted small">บันทึกการแก้ไขในฟอร์มด้านล่างก่อนกดเผยแพร่</p>
</section>
<?php endif ?>

<form method="post" class="stack">
  <?= csrf_field() ?>
  <section class="card">
    <label>บันทึกการเปลี่ยนแปลง (เช่น "เพิ่มมาตรการช้อปลดหย่อน 2569 ตามมติ ครม.")
      <input name="change_note" maxlength="500" value="<?= h($_POST['change_note'] ?? $row['change_note']) ?>"<?= $ro ?>>
    </label>
  </section>

<?php if ($raw): ?>
  <section class="card">
    <h2>JSON ทั้งหมด</h2>
    <textarea name="raw_json" rows="40" class="code"<?= $ro ?>><?= h($jsonText['raw'] ?? json_encode($rules, JSON_FLAGS)) ?></textarea>
  </section>
<?php else: ?>
  <?php
  $groups = ['ทั่วไป' => ['notes', 'filingDeadlines', 'minimumTax', 'elderlyExemption'], 'ค่าใช้จ่าย (อัตรา 0.5 = 50%)' => ['expenses'], 'ค่าลดหย่อน (บาท / อัตรา 0.3 = 30%)' => ['deductions']];
  $flat = flatten($rules);
  foreach ($groups as $title => $prefixes): ?>
  <section class="card">
    <h2><?= h($title) ?></h2>
    <div class="grid">
    <?php foreach ($flat as $path => $val):
        $top = explode('.', $path)[0];
        if (!in_array($top, $prefixes, true) || !isset(LABELS[$path])) continue;
        $posted = $_POST['f'][str_replace('.', '__', $path)] ?? null; ?>
      <label><?= h(LABELS[$path]) ?>
        <input name="f[<?= h(str_replace('.', '__', $path)) ?>]" value="<?= h($posted ?? (string) ($val ?? '')) ?>"<?= is_string($val) ? '' : ' inputmode="decimal" class="num"' ?><?= $ro ?>>
      </label>
    <?php endforeach ?>
    </div>
  </section>
  <?php endforeach ?>

  <?php foreach (JSON_SECTIONS as $key => $label): ?>
  <section class="card">
    <h2><?= h($label) ?></h2>
    <?php if ($key === 'measures'): ?>
      <p class="muted small">แต่ละมาตรการ: id, label, description, inputs (id, label, multiplier, maxActual, step), maxActual (เพดานยอดจ่ายรวม), maxDeduction</p>
    <?php elseif ($key === 'brackets'): ?>
      <p class="muted small">upTo = เพดานของขั้น (ขั้นสุดท้ายใส่ null), rate = อัตรา (0.05 = 5%)</p>
    <?php endif ?>
    <textarea name="json_<?= h($key) ?>" rows="<?= $key === 'measures' ? 18 : 10 ?>" class="code"<?= $ro ?>><?= h($jsonText[$key] ?? json_encode($rules[$key], JSON_FLAGS)) ?></textarea>
  </section>
  <?php endforeach ?>
<?php endif ?>

  <?php if ($editable): ?><div class="sticky-save"><button class="btn">บันทึกร่าง</button></div><?php endif ?>
</form>
<?php page_end();
