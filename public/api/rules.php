<?php
// GET api/rules.php → กฎภาษีฉบับที่เผยแพร่แล้วของทุกปี (แอปเรียกตอนเปิด)
declare(strict_types=1);
require __DIR__ . '/../server/bootstrap.php';

try {
    json_response(['ok' => true, 'rules' => published_rules()]);
} catch (Throwable $e) {
    error_log('[taxeasy] rules: ' . $e->getMessage());
    json_response(['ok' => false, 'error' => 'ฐานข้อมูลยังไม่พร้อม'], 503);
}
