<?php
// POST api/chat.php — AI ผู้ช่วยภาษี (ส่งต่อคำถามไปยัง Claude โดยเก็บ API key ไว้ฝั่งเซิร์ฟเวอร์)
// รับ: { "taxYear": 2569, "messages": [{ "role": "user", "content": "..." }, ...], "context": "สรุปภาษีของผู้ใช้ (ถ้ายินยอม)" }
// ส่งกลับ: { "ok": true, "reply": "..." }
declare(strict_types=1);
require __DIR__ . '/../server/bootstrap.php';

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\RateLimitException;

const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;
const MAX_CONTEXT_CHARS = 6000;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // แอปถามว่าเปิดใช้ AI หรือยัง
    json_response(['ok' => true, 'enabled' => config()['ai']['api_key'] !== '']);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'ใช้ POST เท่านั้น'], 405);
}

$ai = config()['ai'];
if ($ai['api_key'] === '') {
    json_response(['ok' => false, 'code' => 'not_configured', 'error' => 'ผู้ดูแลยังไม่ได้เปิดใช้ AI ผู้ช่วย'], 503);
}
if (!is_file(__DIR__ . '/../server/vendor/autoload.php')) {
    json_response(['ok' => false, 'error' => 'ไม่พบไลบรารี server/vendor'], 500);
}
require __DIR__ . '/../server/vendor/autoload.php';

// ---- ตรวจข้อมูลที่ส่งมา ----
$body = json_decode((string) file_get_contents('php://input'), true);
$messages = $body['messages'] ?? null;
if (!is_array($messages) || $messages === [] || count($messages) > MAX_MESSAGES) {
    json_response(['ok' => false, 'error' => 'บทสนทนายาวเกินไป เริ่มแชทใหม่ได้เลย'], 400);
}
$clean = [];
foreach (array_values($messages) as $i => $m) {
    $role = $m['role'] ?? '';
    $text = trim((string) ($m['content'] ?? ''));
    $expected = $i % 2 === 0 ? 'user' : 'assistant';
    if ($role !== $expected || $text === '' || mb_strlen($text) > MAX_CHARS) {
        json_response(['ok' => false, 'error' => 'ข้อความไม่ถูกต้องหรือยาวเกิน ' . MAX_CHARS . ' ตัวอักษร'], 400);
    }
    $clean[] = ['role' => $role, 'content' => $text];
}
if (end($clean)['role'] !== 'user') {
    json_response(['ok' => false, 'error' => 'ข้อความสุดท้ายต้องเป็นคำถาม'], 400);
}
$context = mb_substr(trim((string) ($body['context'] ?? '')), 0, MAX_CONTEXT_CHARS);
$year = (int) ($body['taxYear'] ?? 0);

// ---- จำกัดจำนวนข้อความต่อเครื่องต่อวัน ----
$clientHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ($ai['api_key']));
try {
    $st = db()->prepare('SELECT COUNT(*) FROM chat_usage WHERE client_hash = ? AND created_at >= NOW() - INTERVAL 1 DAY');
    $st->execute([$clientHash]);
    if ((int) $st->fetchColumn() >= (int) $ai['daily_limit_per_client']) {
        json_response(['ok' => false, 'error' => 'วันนี้ถามครบ ' . $ai['daily_limit_per_client'] . ' ข้อความแล้ว พรุ่งนี้ถามต่อได้'], 429);
    }
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'ฐานข้อมูลยังไม่พร้อม'], 503);
}

// ---- เตรียม prompt: กฎภาษีของปีนั้น (คงที่ แคชได้) + สรุปของผู้ใช้ ----
$rulesByYear = [];
foreach (published_rules() as $r) $rulesByYear[$r['taxYear']] = $r;
$rules = $rulesByYear[$year] ?? (end($rulesByYear) ?: null);

$system = <<<TXT
คุณคือ "น้องภาษี" ผู้ช่วยในแอป ภาษีง่ายๆ (TaxEasy) ช่วยคนไทยเข้าใจและวางแผนภาษีเงินได้บุคคลธรรมดา

วิธีตอบ
- ตอบเป็นภาษาไทยที่เข้าใจง่าย สั้น ตรงประเด็น เหมือนเพื่อนที่รู้เรื่องภาษีอธิบายให้ฟัง ใช้ตัวเลขจริงของผู้ใช้เมื่อมี
- ใช้ตัวเลขเพดานและเงื่อนไขจากกฎภาษีด้านล่างเป็นหลัก ถ้ากฎด้านล่างไม่ได้ระบุเรื่องที่ถาม ให้บอกว่าควรตรวจสอบกับกรมสรรพากร (rd.go.th หรือโทร 1161) แทนการเดา
- เมื่อคำนวณ ให้แสดงวิธีคิดสั้น ๆ เช่น เงินได้ − ค่าใช้จ่าย − ค่าลดหย่อน = เงินได้สุทธิ
- เรื่องการลงทุน (RMF, ThaiESG, ประกัน) อธิบายสิทธิทางภาษีและเงื่อนไขการถือครองได้ แต่ไม่แนะนำกองทุนหรือบริษัทใดเป็นการเฉพาะ และเตือนให้ดูความเหมาะสมกับเป้าหมายการเงินของตัวเอง
- ไม่ช่วยหลบเลี่ยงภาษีหรือแจ้งข้อมูลเท็จ ถ้าผู้ใช้ถามแนวนั้น ให้อธิบายวิธีประหยัดภาษีที่ถูกกฎหมายแทน
- ผู้ใช้ทำงานในแอปที่มีแท็บ สรุป / รายได้ / ลดหย่อน / วางแผน / ตั้งค่า แนะนำให้ไปกรอกที่แท็บที่เกี่ยวข้องได้
- จัดรูปแบบด้วยข้อความธรรมดา ใช้รายการขีด (-) ได้ ไม่ต้องใช้ตารางหรือหัวข้อ markdown
TXT;
$systemBlocks = [['type' => 'text', 'text' => $system]];
if ($rules) {
    $systemBlocks[] = [
        'type' => 'text',
        'text' => "กฎภาษีปี {$rules['taxYear']} (ฉบับที่ {$rules['revision']}) ที่แอปใช้คำนวณ:\n" . json_encode($rules, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'cacheControl' => ['type' => 'ephemeral'],
    ];
}
if ($context !== '') {
    // ใส่สรุปของผู้ใช้ไว้กับคำถามแรก เพื่อให้ส่วนต้นของบทสนทนาคงที่และแคชได้
    $clean[0]['content'] = "ข้อมูลภาษีของฉันจากแอป (ผู้ใช้ยินยอมให้ส่ง):\n$context\n\nคำถาม: " . $clean[0]['content'];
}

// ---- เรียก Claude ----
$model = (string) $ai['model'];
$params = [
    'model' => $model,
    'maxTokens' => (int) $ai['max_tokens'],
    'system' => $systemBlocks,
    'messages' => $clean,
    'outputConfig' => ['effort' => (string) ($ai['effort'] ?? 'low')],
];
// รุ่น Opus/Sonnet/Fable: ถ้ารุ่นหลักปฏิเสธคำขอ ให้ระบบส่งต่อไปยังรุ่นสำรองอัตโนมัติ
if (preg_match('/^claude-(opus|sonnet|fable)-5/', $model)) {
    $params['fallbacks'] = 'default';
    $params['betas'] = ['server-side-fallback-2026-07-01'];
}

try {
    $client = new Client(apiKey: (string) $ai['api_key'], baseUrl: ($ai['base_url'] ?? null) ?: null);
    $message = $client->beta->messages->create(...$params);
} catch (AuthenticationException) {
    error_log('[taxeasy] chat: invalid API key');
    json_response(['ok' => false, 'error' => 'API key ของ AI ไม่ถูกต้อง แจ้งผู้ดูแลระบบ'], 502);
} catch (RateLimitException) {
    json_response(['ok' => false, 'error' => 'มีคนใช้งานพร้อมกันเยอะ ลองอีกครั้งในอีกสักครู่'], 503);
} catch (APIConnectionException) {
    json_response(['ok' => false, 'error' => 'เซิร์ฟเวอร์เชื่อมต่อ AI ไม่ได้ ตรวจอินเทอร์เน็ตของเครื่องเซิร์ฟเวอร์'], 502);
} catch (APIStatusException $e) {
    error_log('[taxeasy] chat: ' . $e->getMessage());
    json_response(['ok' => false, 'error' => 'AI ตอบไม่ได้ในตอนนี้ ลองใหม่อีกครั้ง'], 502);
}

db()->prepare('INSERT INTO chat_usage (client_hash, input_tokens, output_tokens) VALUES (?, ?, ?)')
    ->execute([$clientHash, $message->usage->inputTokens + (int) $message->usage->cacheReadInputTokens + (int) $message->usage->cacheCreationInputTokens, $message->usage->outputTokens]);

if ($message->stopReason === 'refusal') {
    json_response(['ok' => true, 'reply' => 'ขอโทษครับ คำถามนี้น้องภาษีตอบให้ไม่ได้ ลองถามเรื่องภาษีเงินได้ ค่าลดหย่อน หรือการยื่นภาษีได้เลยครับ']);
}
$reply = '';
foreach ($message->content as $block) {
    if ($block->type === 'text') $reply .= $block->text;
}
if ($message->stopReason === 'max_tokens') $reply .= "\n\n(คำตอบยาวเกินไปเลยถูกตัด ลองถามให้แคบลงได้ครับ)";
json_response(['ok' => true, 'reply' => trim($reply) !== '' ? trim($reply) : 'ขอโทษครับ ลองถามใหม่อีกครั้งได้ไหมครับ']);
