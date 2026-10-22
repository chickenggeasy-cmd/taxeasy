<?php
// POST api/scan.php — อ่านตัวเลขจากรูป/PDF หนังสือรับรอง 50 ทวิ ด้วย Claude
// รับ: { "mediaType": "image/jpeg" | "image/png" | "image/webp" | "application/pdf", "data": "<base64>" }
// ส่งกลับ: { "ok": true, "result": { found, taxYear, employer, salary, withheld, socialSecurity, providentFund, note } }
// ไฟล์ไม่ถูกเก็บไว้บนเซิร์ฟเวอร์ ส่งต่อให้ AI อ่านแล้วทิ้ง
declare(strict_types=1);
require __DIR__ . '/../server/bootstrap.php';

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\RateLimitException;

const MAX_BYTES = 4_500_000;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MIN_PHP = 80100;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'ใช้ POST เท่านั้น'], 405);
}
if (PHP_VERSION_ID < MIN_PHP) {
    json_response(['ok' => false, 'code' => 'php_version', 'error' => 'การสแกนเอกสารต้องใช้ PHP 8.1 ขึ้นไป (เซิร์ฟเวอร์นี้ใช้ ' . PHP_VERSION . ')'], 503);
}
$ai = config()['ai'];
if ($ai['api_key'] === '') {
    json_response(['ok' => false, 'code' => 'not_configured', 'error' => 'ผู้ดูแลยังไม่ได้เปิดใช้ AI จึงสแกนเอกสารไม่ได้ กรอกตัวเลขเองได้เลย'], 503);
}
if (!is_file(__DIR__ . '/../server/vendor/autoload.php')) {
    json_response(['ok' => false, 'error' => 'ไม่พบไลบรารี server/vendor'], 500);
}
require __DIR__ . '/../server/vendor/autoload.php';

// ---- ตรวจไฟล์ ----
$body = json_decode((string) file_get_contents('php://input'), true);
$type = (string) ($body['mediaType'] ?? '');
$raw = base64_decode((string) ($body['data'] ?? ''), true);
if (!in_array($type, TYPES, true) || $raw === false || $raw === '') {
    json_response(['ok' => false, 'error' => 'รองรับเฉพาะรูป JPG, PNG, WebP หรือไฟล์ PDF'], 400);
}
if (strlen($raw) > MAX_BYTES) {
    json_response(['ok' => false, 'error' => 'ไฟล์ใหญ่เกินไป (สูงสุดประมาณ 4.5 MB)'], 413);
}
// ตรวจหัวไฟล์ให้ตรงกับชนิดที่แจ้งมา
$magic = [
    'image/jpeg' => "\xFF\xD8\xFF",
    'image/png' => "\x89PNG",
    'image/webp' => 'RIFF',
    'application/pdf' => '%PDF',
];
if (!str_starts_with($raw, $magic[$type])) {
    json_response(['ok' => false, 'error' => 'ไฟล์ไม่ตรงกับชนิดที่แจ้ง'], 400);
}

// ---- ใช้โควตาร่วมกับ AI ผู้ช่วย (ต่อเครื่องต่อวัน) ----
$clientHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ($ai['api_key']));
try {
    $st = db()->prepare('SELECT COUNT(*) FROM chat_usage WHERE client_hash = ? AND created_at >= NOW() - INTERVAL 1 DAY');
    $st->execute([$clientHash]);
    if ((int) $st->fetchColumn() >= (int) $ai['daily_limit_per_client']) {
        json_response(['ok' => false, 'error' => 'วันนี้ใช้ AI ครบโควตาแล้ว พรุ่งนี้สแกนต่อได้ หรือกรอกตัวเลขเองได้เลย'], 429);
    }
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'ฐานข้อมูลยังไม่พร้อม'], 503);
}

$schema = [
    'type' => 'object',
    'properties' => [
        'found' => ['type' => 'boolean', 'description' => 'true ถ้าเป็นหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) ที่อ่านได้'],
        'taxYear' => ['type' => ['integer', 'null'], 'description' => 'ปีภาษี พ.ศ. ที่จ่ายเงิน เช่น 2568'],
        'employer' => ['type' => 'string', 'description' => 'ชื่อผู้มีหน้าที่หักภาษี ณ ที่จ่าย (นายจ้าง)'],
        'salary' => ['type' => 'number', 'description' => 'จำนวนเงินที่จ่าย ประเภทเงินได้ 40(1) เงินเดือน ค่าจ้าง โบนัส รวมทั้งปี'],
        'withheld' => ['type' => 'number', 'description' => 'ภาษีที่หักและนำส่งไว้ ของเงินได้ 40(1)'],
        'socialSecurity' => ['type' => 'number', 'description' => 'เงินสมทบกองทุนประกันสังคม'],
        'providentFund' => ['type' => 'number', 'description' => 'เงินสะสมกองทุนสำรองเลี้ยงชีพ ที่ลูกจ้างจ่าย'],
        'note' => ['type' => 'string', 'description' => 'ข้อสังเกตสั้น ๆ ภาษาไทย เช่น ช่องที่อ่านไม่ชัด หรือมีเงินได้ประเภทอื่นในเอกสาร ถ้าไม่มีให้เป็นข้อความว่าง'],
    ],
    'required' => ['found', 'taxYear', 'employer', 'salary', 'withheld', 'socialSecurity', 'providentFund', 'note'],
    'additionalProperties' => false,
];

$file = $type === 'application/pdf'
    ? ['type' => 'document', 'source' => ['type' => 'base64', 'mediaType' => $type, 'data' => base64_encode($raw)]]
    : ['type' => 'image', 'source' => ['type' => 'base64', 'mediaType' => $type, 'data' => base64_encode($raw)]];

$model = (string) $ai['model'];
$params = [
    'model' => $model,
    'maxTokens' => 1500,
    'system' => 'คุณอ่านเอกสารภาษีไทยอย่างแม่นยำ ดึงเฉพาะตัวเลขที่เห็นในเอกสารจริง ห้ามเดาหรือคำนวณเอง ช่องที่ไม่มีหรืออ่านไม่ออกให้ใส่ 0 และระบุใน note ตัวเลขเป็นบาท ไม่ใส่จุลภาค',
    'messages' => [[
        'role' => 'user',
        'content' => [$file, ['type' => 'text', 'text' => 'อ่านหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) นี้ ถ้ามีหลายใบให้รวมเฉพาะเงินได้ 40(1) ถ้าไม่ใช่ 50 ทวิ ให้ found เป็น false']],
    ]],
    'outputConfig' => ['effort' => (string) ($ai['effort'] ?? 'low'), 'format' => ['type' => 'json_schema', 'schema' => $schema]],
];
if (preg_match('/^claude-(opus|sonnet|fable)-5/', $model)) {
    $params['fallbacks'] = 'default';
    $params['betas'] = ['server-side-fallback-2026-07-01'];
}

try {
    $client = new Client(apiKey: (string) $ai['api_key'], baseUrl: ($ai['base_url'] ?? null) ?: null);
    $message = $client->beta->messages->create(...$params);
} catch (AuthenticationException) {
    error_log('[taxeasy] scan: invalid API key');
    json_response(['ok' => false, 'error' => 'API key ของ AI ไม่ถูกต้อง แจ้งผู้ดูแลระบบ'], 502);
} catch (RateLimitException) {
    json_response(['ok' => false, 'error' => 'มีคนใช้งานพร้อมกันเยอะ ลองอีกครั้งในอีกสักครู่'], 503);
} catch (APIConnectionException) {
    json_response(['ok' => false, 'error' => 'เซิร์ฟเวอร์เชื่อมต่อ AI ไม่ได้ ตรวจอินเทอร์เน็ตของเครื่องเซิร์ฟเวอร์'], 502);
} catch (APIStatusException $e) {
    error_log('[taxeasy] scan: ' . $e->getMessage());
    json_response(['ok' => false, 'error' => 'อ่านเอกสารไม่สำเร็จ ลองถ่ายใหม่ให้ชัดขึ้น'], 502);
}

db()->prepare('INSERT INTO chat_usage (client_hash, input_tokens, output_tokens) VALUES (?, ?, ?)')
    ->execute([$clientHash, $message->usage->inputTokens + (int) $message->usage->cacheReadInputTokens + (int) $message->usage->cacheCreationInputTokens, $message->usage->outputTokens]);

if ($message->stopReason === 'refusal') {
    json_response(['ok' => false, 'error' => 'อ่านเอกสารนี้ไม่ได้ กรอกตัวเลขเองได้เลย'], 422);
}
$text = '';
foreach ($message->content as $block) {
    if ($block->type === 'text') $text .= $block->text;
}
$data = json_decode($text, true);
if (!is_array($data)) {
    json_response(['ok' => false, 'error' => 'อ่านเอกสารไม่สำเร็จ ลองถ่ายใหม่ให้ชัดขึ้น'], 502);
}
$num = fn($v) => is_numeric($v) && $v >= 0 && $v < 1e10 ? round((float) $v, 2) : 0;
json_response(['ok' => true, 'result' => [
    'found' => (bool) ($data['found'] ?? false),
    'taxYear' => is_int($data['taxYear'] ?? null) ? $data['taxYear'] : null,
    'employer' => mb_substr((string) ($data['employer'] ?? ''), 0, 200),
    'salary' => $num($data['salary'] ?? 0),
    'withheld' => $num($data['withheld'] ?? 0),
    'socialSecurity' => $num($data['socialSecurity'] ?? 0),
    'providentFund' => $num($data['providentFund'] ?? 0),
    'note' => mb_substr((string) ($data['note'] ?? ''), 0, 500),
]]);
