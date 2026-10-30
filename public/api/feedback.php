<?php
// POST api/feedback.php — ผู้ใช้แจ้งปัญหา / ตัวเลขไม่ตรง / ข้อเสนอแนะ ทีมดูได้ที่หลังบ้าน admin/feedback.php
// รับ: { "category": "wrong_number"|"bug"|"idea"|"other", "message": "...", "contact": "", "taxYear": 2569,
//        "rulesRevision": 1, "page": "summary", "calcSummary": "สรุปตัวเลข (เฉพาะเมื่อผู้ใช้ยินยอม)" }
// ส่งกลับ: { "ok": true }
declare(strict_types=1);
require __DIR__ . '/../server/bootstrap.php';

const MAX_MESSAGE = 2000;
const MAX_CONTACT = 200;
const MAX_SUMMARY = 6000;
const DAILY_LIMIT = 10;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'ใช้ POST เท่านั้น'], 405);
}

$body = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($body)) {
    json_response(['ok' => false, 'error' => 'ข้อมูลไม่ถูกต้อง'], 400);
}
$category = (string) ($body['category'] ?? '');
$message = trim((string) ($body['message'] ?? ''));
$contact = trim((string) ($body['contact'] ?? ''));
$summary = trim((string) ($body['calcSummary'] ?? ''));
$page = preg_replace('/[^a-z]/', '', (string) ($body['page'] ?? ''));
$year = (int) ($body['taxYear'] ?? 0);
$revision = (int) ($body['rulesRevision'] ?? 0);

if (!array_key_exists($category, FEEDBACK_CATEGORIES)) {
    json_response(['ok' => false, 'error' => 'เลือกหัวข้อที่จะแจ้ง'], 400);
}
if ($message === '' || mb_strlen($message) > MAX_MESSAGE) {
    json_response(['ok' => false, 'error' => 'เขียนรายละเอียด 1–' . number_format(MAX_MESSAGE) . ' ตัวอักษร'], 400);
}
if (mb_strlen($contact) > MAX_CONTACT || mb_strlen($summary) > MAX_SUMMARY) {
    json_response(['ok' => false, 'error' => 'ข้อมูลยาวเกินไป'], 400);
}

$clientHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|taxeasy-feedback');
try {
    ensure_feedback_table();
    $st = db()->prepare('SELECT COUNT(*) FROM feedback WHERE client_hash = ? AND created_at >= NOW() - INTERVAL 1 DAY');
    $st->execute([$clientHash]);
    if ((int) $st->fetchColumn() >= DAILY_LIMIT) {
        json_response(['ok' => false, 'error' => 'วันนี้ส่งครบ ' . DAILY_LIMIT . ' เรื่องแล้ว พรุ่งนี้ส่งต่อได้'], 429);
    }
    db()->prepare('INSERT INTO feedback (category, message, contact, tax_year, rules_revision, calc_summary, page, client_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([
            $category,
            $message,
            $contact,
            $year >= 2500 && $year <= 2700 ? $year : null,
            $revision > 0 ? $revision : null,
            $summary !== '' ? $summary : null,
            mb_substr((string) $page, 0, 30),
            $clientHash,
        ]);
    // เก็บไม่เกิน 1 ปี ตามที่แจ้งไว้ในนโยบายความเป็นส่วนตัว
    db()->exec('DELETE FROM feedback WHERE created_at < NOW() - INTERVAL 365 DAY');
} catch (Throwable $e) {
    error_log('[taxeasy] feedback: ' . $e->getMessage());
    json_response(['ok' => false, 'error' => 'ฐานข้อมูลยังไม่พร้อม ลองใหม่ภายหลัง'], 503);
}
json_response(['ok' => true]);
