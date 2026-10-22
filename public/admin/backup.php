<?php
// สำรองฐานข้อมูล: ดาวน์โหลดเป็นไฟล์ .sql นำกลับเข้าได้ผ่าน phpMyAdmin → Import
declare(strict_types=1);
require __DIR__ . '/_inc.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    $pdo = db();
    $q = fn($v) => $v === null ? 'NULL' : $pdo->quote((string) $v);
    $out = "-- สำรองข้อมูลภาษีง่ายๆ " . date('Y-m-d H:i:s') . "\n-- นำเข้าผ่าน phpMyAdmin → เลือกฐานข้อมูล taxeasy → Import\n";
    $out .= "-- ข้อมูลในตาราง rule_sets และ audit_log จะถูกแทนที่ด้วยข้อมูลในไฟล์นี้ (บัญชีผู้ดูแลไม่ถูกแตะต้อง)\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n";
    foreach (['rule_sets' => ['id', 'tax_year', 'revision', 'status', 'rules_json', 'change_note', 'created_by', 'created_at', 'published_at'], 'audit_log' => ['id', 'admin_id', 'action', 'detail', 'created_at']] as $table => $cols) {
        $out .= "\nDELETE FROM `$table`;\n";
        foreach ($pdo->query("SELECT `" . implode('`,`', $cols) . "` FROM `$table` ORDER BY id") as $row) {
            $out .= "INSERT INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (" . implode(', ', array_map($q, array_values($row))) . ");\n";
        }
    }
    $out .= "\nSET FOREIGN_KEY_CHECKS = 1;\n";
    audit('backup', 'ดาวน์โหลดไฟล์สำรองฐานข้อมูล');
    header('Content-Type: application/sql; charset=utf-8');
    header('Content-Disposition: attachment; filename="taxeasy-backup-' . date('Ymd-His') . '.sql"');
    header('Cache-Control: no-store');
    echo $out;
    exit;
}

$counts = db()->query("SELECT (SELECT COUNT(*) FROM rule_sets) AS rules, (SELECT COUNT(*) FROM audit_log) AS logs")->fetch();
page_start('สำรองข้อมูล');
?>
<section class="card narrow">
  <h1>สำรองฐานข้อมูล</h1>
  <p>ไฟล์สำรองมีกฎภาษีทุกฉบับ (<?= (int) $counts['rules'] ?> ฉบับ) และประวัติการทำงาน (<?= (int) $counts['logs'] ?> รายการ) ไม่รวมรหัสผ่านผู้ดูแล</p>
  <form method="post"><?= csrf_field() ?><button class="btn">ดาวน์โหลดไฟล์สำรอง (.sql)</button></form>
  <p class="muted small">กู้คืน: เปิด phpMyAdmin → เลือกฐานข้อมูล taxeasy → แท็บ Import → เลือกไฟล์นี้ ข้อมูลกฎภาษีจะกลับเป็นตามไฟล์ แนะนำให้สำรองก่อนเผยแพร่กฎใหม่ทุกครั้ง</p>
</section>
<?php page_end();
