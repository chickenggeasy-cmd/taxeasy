<?php
// GET api/market.php?range=1d|1mo|6mo|1y — ภาพรวมดัชนีตลาดหุ้นโลก (ข้อมูลล่าช้า ใช้ดูเท่านั้น)
// ดึงจากผู้ให้บริการข้อมูลแล้วเก็บไว้ในตาราง market_cache ตามเวลาที่ตั้ง (ค่าเริ่มต้น 60 วินาที)
// เพื่อไม่ให้เรียกผู้ให้บริการบ่อยเกินไป ถ้าดึงไม่ได้จะส่งข้อมูลล่าสุดที่เก็บไว้แทน
declare(strict_types=1);
require __DIR__ . '/../server/bootstrap.php';

const MARKET_SYMBOLS = [
    ['symbol' => '^SET.BK', 'name' => 'SET', 'nameTh' => 'ตลาดหุ้นไทย', 'region' => 'TH'],
    ['symbol' => '^GSPC', 'name' => 'S&P 500', 'nameTh' => 'สหรัฐอเมริกา', 'region' => 'US'],
    ['symbol' => '^IXIC', 'name' => 'Nasdaq', 'nameTh' => 'สหรัฐอเมริกา (เทคโนโลยี)', 'region' => 'US'],
    ['symbol' => '^DJI', 'name' => 'Dow Jones', 'nameTh' => 'สหรัฐอเมริกา', 'region' => 'US'],
    ['symbol' => '^N225', 'name' => 'Nikkei 225', 'nameTh' => 'ญี่ปุ่น', 'region' => 'JP'],
    ['symbol' => '^HSI', 'name' => 'Hang Seng', 'nameTh' => 'ฮ่องกง', 'region' => 'HK'],
    ['symbol' => '000001.SS', 'name' => 'Shanghai', 'nameTh' => 'จีน', 'region' => 'CN'],
    ['symbol' => '^FTSE', 'name' => 'FTSE 100', 'nameTh' => 'อังกฤษ', 'region' => 'GB'],
    ['symbol' => '^GDAXI', 'name' => 'DAX', 'nameTh' => 'เยอรมนี', 'region' => 'DE'],
    ['symbol' => 'GC=F', 'name' => 'Gold', 'nameTh' => 'ทองคำ (ดอลลาร์/ออนซ์)', 'region' => 'XX'],
    ['symbol' => 'THB=X', 'name' => 'USD/THB', 'nameTh' => 'ค่าเงินบาท (บาทต่อดอลลาร์)', 'region' => 'TH'],
];
const RANGES = ['1d' => '5m', '1mo' => '1d', '6mo' => '1d', '1y' => '1wk'];

$range = (string) ($_GET['range'] ?? '1d');
if (!isset(RANGES[$range])) $range = '1d';

$cfg = (config()['market'] ?? []) + [
    'base_url' => 'https://query1.finance.yahoo.com',
    'ttl' => 60,
    'timeout' => 8,
];

try {
    db()->exec('CREATE TABLE IF NOT EXISTS market_cache (
        cache_key VARCHAR(40) PRIMARY KEY,
        payload MEDIUMTEXT NOT NULL,
        fetched_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'ฐานข้อมูลยังไม่พร้อม'], 503);
}

$key = "indices:$range";
$st = db()->prepare('SELECT payload, fetched_at, TIMESTAMPDIFF(SECOND, fetched_at, NOW()) AS age FROM market_cache WHERE cache_key = ?');
$st->execute([$key]);
$cached = $st->fetch() ?: null;

if ($cached && (int) $cached['age'] < (int) $cfg['ttl']) {
    $data = json_decode($cached['payload'], true);
    json_response(['ok' => true, 'cached' => true] + $data);
}

/** ดึงกราฟของหลายสัญลักษณ์พร้อมกัน */
function fetch_all(array $symbols, string $range, array $cfg): array
{
    if (!function_exists('curl_multi_init')) return [];
    $mh = curl_multi_init();
    $handles = [];
    foreach ($symbols as $s) {
        $url = rtrim($cfg['base_url'], '/') . '/v8/finance/chart/' . rawurlencode($s['symbol']) . '?range=' . $range . '&interval=' . RANGES[$range];
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => (int) $cfg['timeout'],
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (TaxEasy school project)',
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        curl_multi_add_handle($mh, $ch);
        $handles[$s['symbol']] = $ch;
    }
    do {
        $status = curl_multi_exec($mh, $running);
        if ($running) curl_multi_select($mh, 1.0);
    } while ($running && $status === CURLM_OK);

    $out = [];
    foreach ($symbols as $s) {
        $ch = $handles[$s['symbol']];
        $body = curl_multi_getcontent($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
        if ($code !== 200 || !$body) continue;
        $j = json_decode($body, true);
        $r = $j['chart']['result'][0] ?? null;
        if (!$r) continue;
        $closes = array_values(array_filter($r['indicators']['quote'][0]['close'] ?? [], fn($v) => is_numeric($v)));
        $meta = $r['meta'] ?? [];
        $price = $meta['regularMarketPrice'] ?? (end($closes) ?: null);
        // เปลี่ยนแปลงวันนี้เทียบราคาปิดวันก่อน (ถ้าผู้ให้บริการไม่ส่งมา ใช้จุดก่อนสุดท้ายของกราฟรายวัน)
        $prev = $meta['previousClose'] ?? ($range === '1d' ? ($meta['chartPreviousClose'] ?? null) : null);
        if ($prev === null && RANGES[$range] === '1d' && count($closes) > 1) $prev = $closes[count($closes) - 2];
        if (!is_numeric($price)) continue;
        $out[] = $s + [
            'price' => round((float) $price, 2),
            'change' => is_numeric($prev) ? round((float) $price - (float) $prev, 2) : null,
            'changePct' => is_numeric($prev) && (float) $prev != 0 ? round(((float) $price / (float) $prev - 1) * 100, 2) : null,
            'rangeChangePct' => count($closes) > 1 && $closes[0] != 0 ? round(((float) $price / (float) $closes[0] - 1) * 100, 2) : null,
            'currency' => $meta['currency'] ?? null,
            'points' => array_map(fn($v) => round((float) $v, 2), $closes),
            'marketTime' => isset($meta['regularMarketTime']) ? date('c', (int) $meta['regularMarketTime']) : null,
        ];
    }
    curl_multi_close($mh);
    return $out;
}

$items = fetch_all(MARKET_SYMBOLS, $range, $cfg);

if (!$items) {
    if ($cached) {
        $data = json_decode($cached['payload'], true);
        json_response(['ok' => true, 'cached' => true, 'stale' => true] + $data);
    }
    json_response(['ok' => false, 'error' => 'ดึงข้อมูลตลาดไม่ได้ ตรวจว่าเครื่องเซิร์ฟเวอร์ต่ออินเทอร์เน็ตได้'], 502);
}

$data = ['range' => $range, 'source' => 'Yahoo Finance', 'delayed' => true, 'updatedAt' => date('c'), 'items' => $items];
db()->prepare('REPLACE INTO market_cache (cache_key, payload, fetched_at) VALUES (?, ?, NOW())')
    ->execute([$key, json_encode($data, JSON_UNESCAPED_UNICODE)]);
json_response(['ok' => true, 'cached' => false] + $data);
