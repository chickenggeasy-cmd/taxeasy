<?php
declare(strict_types=1);
require __DIR__ . '/_inc.php';
$adminId = require_login();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') redirect('index.php');
check_csrf();

$pdo = db();
$find = function (int $id) use ($pdo): array {
    $st = $pdo->prepare('SELECT * FROM rule_sets WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
    if (!$row) {
        flash('ไม่พบกฎฉบับนี้', 'err');
        redirect('index.php');
    }
    return $row;
};
$nextRevision = function (int $year) use ($pdo): int {
    $st = $pdo->prepare('SELECT COALESCE(MAX(revision), 0) + 1 FROM rule_sets WHERE tax_year = ?');
    $st->execute([$year]);
    return (int) $st->fetchColumn();
};
$insertDraft = function (array $rules, string $note) use ($pdo, $adminId, $nextRevision): int {
    $rules['revision'] = $nextRevision($rules['taxYear']);
    $pdo->prepare("INSERT INTO rule_sets (tax_year, revision, status, rules_json, change_note, created_by) VALUES (?, ?, 'draft', ?, ?, ?)")
        ->execute([$rules['taxYear'], $rules['revision'], json_encode($rules, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), $note, $adminId]);
    return (int) $pdo->lastInsertId();
};

switch ($_POST['do'] ?? '') {
    case 'new_draft':
        $src = $find((int) $_POST['id']);
        $rules = json_decode($src['rules_json'], true);
        $id = $insertDraft($rules, '');
        audit('new_draft', "สร้างร่างปี {$src['tax_year']} จากฉบับที่ {$src['revision']}");
        flash('สร้างร่างแล้ว แก้ไขแล้วกด “เผยแพร่” เมื่อพร้อม');
        redirect("edit.php?id=$id");

    case 'new_year':
        $latest = $pdo->query("SELECT * FROM rule_sets WHERE status = 'published' ORDER BY tax_year DESC, revision DESC LIMIT 1")->fetch();
        if (!$latest) {
            flash('ต้องมีปีที่เผยแพร่แล้วอย่างน้อย 1 ปี', 'err');
            redirect('index.php');
        }
        $rules = json_decode($latest['rules_json'], true);
        $year = $rules['taxYear'] + 1;
        $exists = $pdo->prepare('SELECT COUNT(*) FROM rule_sets WHERE tax_year = ?');
        $exists->execute([$year]);
        if ((int) $exists->fetchColumn() > 0) {
            flash("มีปีภาษี $year อยู่แล้ว", 'err');
            redirect('index.php');
        }
        $rules['taxYear'] = $year;
        $rules['notes'] = "กฎภาษีเงินได้บุคคลธรรมดา ปีภาษี $year (คัดลอกจากปี " . ($year - 1) . ' ตรวจสอบมาตรการใหม่ก่อนเผยแพร่)';
        $rules['measures'] = [];
        foreach ($rules['filingDeadlines'] as $k => $d) {
            $rules['filingDeadlines'][$k] = preg_replace_callback('/^\d{4}/', fn($m) => (string) ((int) $m[0] + 1), $d);
        }
        $id = $insertDraft($rules, "เริ่มปีภาษี $year จากปี " . ($year - 1));
        audit('new_year', "สร้างร่างปีภาษี $year");
        flash("สร้างร่างปีภาษี $year แล้ว มาตรการพิเศษถูกล้างออก เพราะมักใช้ได้เฉพาะปี");
        redirect("edit.php?id=$id");

    case 'publish':
        $row = $find((int) $_POST['id']);
        if ($row['status'] !== 'draft') redirect('index.php');
        $rules = json_decode($row['rules_json'], true);
        $rules['revision'] = (int) $row['revision'];
        $rules['updatedAt'] = date('Y-m-d');
        if ($errors = validate_rules($rules, (int) $row['tax_year'])) {
            flash('เผยแพร่ไม่ได้: ' . implode(' · ', $errors), 'err');
            redirect("edit.php?id={$row['id']}");
        }
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE rule_sets SET status = 'archived' WHERE tax_year = ? AND status = 'published'")->execute([$row['tax_year']]);
        $pdo->prepare("UPDATE rule_sets SET status = 'published', published_at = NOW(), rules_json = ? WHERE id = ?")
            ->execute([json_encode($rules, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), $row['id']]);
        $pdo->commit();
        audit('publish', "เผยแพร่กฎปี {$row['tax_year']} ฉบับที่ {$row['revision']}" . ($row['change_note'] ? " — {$row['change_note']}" : ''));
        flash("เผยแพร่กฎปี {$row['tax_year']} ฉบับที่ {$row['revision']} แล้ว ผู้ใช้จะได้กฎใหม่เมื่อเปิดแอปครั้งถัดไป");
        redirect('index.php');

    case 'delete':
        $row = $find((int) $_POST['id']);
        if ($row['status'] === 'draft') {
            $pdo->prepare("DELETE FROM rule_sets WHERE id = ? AND status = 'draft'")->execute([$row['id']]);
            audit('delete', "ลบร่างปี {$row['tax_year']} ฉบับที่ {$row['revision']}");
            flash('ลบร่างแล้ว');
        }
        redirect('index.php');
}
redirect('index.php');
