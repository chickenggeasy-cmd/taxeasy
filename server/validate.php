<?php
declare(strict_types=1);

/**
 * ตรวจไฟล์กฎภาษีก่อนบันทึก ป้องกันแอปของผู้ใช้พังจากข้อมูลผิดรูปแบบ
 * คืนค่ารายการข้อผิดพลาด (ว่าง = ผ่าน)
 */
function validate_rules(mixed $r, ?int $expectYear = null): array
{
    $e = [];
    if (!is_array($r)) {
        return ['ไม่ใช่ JSON object'];
    }
    $num = fn($v) => is_int($v) || is_float($v);
    $rate = fn($v) => $num($v) && $v >= 0 && $v <= 1;
    $rateMax = fn($v) => is_array($v) && $rate($v['rate'] ?? null) && $num($v['max'] ?? null) && $v['max'] >= 0;

    if (!is_int($r['taxYear'] ?? null) || $r['taxYear'] < 2500 || $r['taxYear'] > 2700) $e[] = 'taxYear ต้องเป็นปี พ.ศ.';
    if ($expectYear !== null && ($r['taxYear'] ?? null) !== $expectYear) $e[] = "taxYear ต้องเป็น $expectYear";
    if (!is_string($r['updatedAt'] ?? null)) $e[] = 'ต้องมี updatedAt';
    if (!is_array($r['sources'] ?? null)) $e[] = 'sources ต้องเป็นรายการ';
    foreach (['paper', 'online'] as $k) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($r['filingDeadlines'][$k] ?? ''))) $e[] = "filingDeadlines.$k ต้องเป็นรูปแบบ YYYY-MM-DD (พ.ศ.)";
    }

    $brackets = $r['brackets'] ?? null;
    if (!is_array($brackets) || count($brackets) < 2) {
        $e[] = 'brackets ต้องมีอย่างน้อย 2 ขั้น';
    } else {
        $prev = 0;
        foreach ($brackets as $i => $b) {
            $last = $i === count($brackets) - 1;
            if (!$rate($b['rate'] ?? null)) $e[] = "ขั้นที่ " . ($i + 1) . ": rate ต้องอยู่ระหว่าง 0–1";
            $up = $b['upTo'] ?? null;
            if ($last ? $up !== null : (!$num($up) || $up <= $prev)) {
                $e[] = "ขั้นที่ " . ($i + 1) . ($last ? ': ขั้นสุดท้าย upTo ต้องเป็น null' : ': upTo ต้องมากกว่าขั้นก่อนหน้า');
            }
            if ($num($up)) $prev = $up;
        }
    }

    $mt = $r['minimumTax'] ?? [];
    if (!$rate($mt['rate'] ?? null) || !$num($mt['incomeThreshold'] ?? null) || !$num($mt['exemptIfNotExceed'] ?? null)) $e[] = 'minimumTax ไม่ครบ';
    if (!$num($r['elderlyExemption'] ?? null)) $e[] = 'ต้องมี elderlyExemption';

    $ex = $r['expenses'] ?? [];
    foreach (['employment', 'royalty'] as $k) if (!$rateMax($ex[$k] ?? null)) $e[] = "expenses.$k ต้องมี rate และ max";
    foreach (['building', 'agriLand', 'otherLand', 'vehicle', 'other'] as $k) if (!$rate($ex['rent'][$k] ?? null)) $e[] = "expenses.rent.$k ไม่ถูกต้อง";
    foreach (['medical', 'other'] as $k) if (!$rate($ex['professional'][$k] ?? null)) $e[] = "expenses.professional.$k ไม่ถูกต้อง";
    foreach (['contract', 'business'] as $k) if (!$rate($ex[$k]['rate'] ?? null)) $e[] = "expenses.$k.rate ไม่ถูกต้อง";

    $d = $r['deductions'] ?? [];
    $amounts = ['personal', 'spouse', 'child', 'childSecondPlusBornFrom2561', 'parent', 'disabledCare', 'prenatal', 'socialSecurity',
        'lifeInsurance', 'healthInsurance', 'lifeHealthCombined', 'spouseLifeInsurance', 'parentHealthInsurance', 'nsf',
        'retirementCombined', 'thaiEsgxLtf', 'homeLoanInterest', 'socialEnterprise', 'politicalDonation'];
    foreach ($amounts as $k) if (!$num($d[$k] ?? null) || $d[$k] < 0) $e[] = "deductions.$k ต้องเป็นตัวเลข ≥ 0";
    foreach (['pensionInsurance', 'pvd', 'gpf', 'rmf'] as $k) if (!$rateMax($d[$k] ?? null)) $e[] = "deductions.$k ต้องมี rate และ max";
    foreach (['ssf', 'thaiEsg'] as $k) if (($d[$k] ?? null) !== null && !$rateMax($d[$k])) $e[] = "deductions.$k ต้องเป็น null หรือมี rate และ max";
    if (!array_key_exists('ssf', $d) || !array_key_exists('thaiEsg', $d)) $e[] = 'deductions ต้องมี ssf และ thaiEsg (ใส่ null ถ้าไม่มีสิทธิ)';
    if (!$rate($d['donationCapRate'] ?? null)) $e[] = 'deductions.donationCapRate ต้องอยู่ระหว่าง 0–1';

    $measures = $r['measures'] ?? null;
    if (!is_array($measures)) {
        $e[] = 'measures ต้องเป็นรายการ (ใส่ [] ถ้าไม่มี)';
    } else {
        $ids = [];
        foreach ($measures as $i => $m) {
            $n = 'มาตรการที่ ' . ($i + 1);
            if (!preg_match('/^[a-z0-9-]+$/', (string) ($m['id'] ?? ''))) $e[] = "$n: id ใช้ได้เฉพาะ a-z 0-9 และ -";
            elseif (isset($ids[$m['id']])) $e[] = "$n: id ซ้ำ";
            else $ids[$m['id']] = true;
            if (!is_string($m['label'] ?? null) || $m['label'] === '') $e[] = "$n: ต้องมี label";
            if (!$num($m['maxDeduction'] ?? null)) $e[] = "$n: ต้องมี maxDeduction";
            if (isset($m['maxActual']) && !$num($m['maxActual'])) $e[] = "$n: maxActual ต้องเป็นตัวเลข";
            if (!is_array($m['inputs'] ?? null) || !$m['inputs']) {
                $e[] = "$n: ต้องมี inputs อย่างน้อย 1 ช่อง";
                continue;
            }
            foreach ($m['inputs'] as $j => $in) {
                $p = "$n ช่องที่ " . ($j + 1);
                if (!preg_match('/^[a-z0-9-]+$/', (string) ($in['id'] ?? ''))) $e[] = "$p: id ไม่ถูกต้อง";
                if (!is_string($in['label'] ?? null)) $e[] = "$p: ต้องมี label";
                if (!$num($in['multiplier'] ?? null) || $in['multiplier'] <= 0) $e[] = "$p: multiplier ต้องมากกว่า 0";
                foreach (['maxActual', 'step'] as $k) if (isset($in[$k]) && (!$num($in[$k]) || $in[$k] <= 0)) $e[] = "$p: $k ต้องมากกว่า 0";
            }
        }
    }
    return $e;
}
