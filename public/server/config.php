<?php
// ตั้งค่าของภาษีง่ายๆ — ค่าเริ่มต้นตรงกับ XAMPP ที่ติดตั้งใหม่
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'taxeasy',
        'user' => 'root',
        'pass' => '',
    ],

    // AI ผู้ช่วย: ใส่ API key จาก https://console.anthropic.com (เว้นว่างไว้ = ปิดใช้งาน)
    'ai' => [
        'api_key' => getenv('ANTHROPIC_API_KEY') ?: '',
        // claude-opus-5-5 ตอบละเอียดที่สุด / claude-haiku-5-5 ถูกกว่ามาก (ประมาณ 1 ใน 40) เหมาะถ้ามีผู้ใช้เยอะ
        'model' => 'claude-opus-5-5',
        // low = ตอบเร็วและประหยัด เหมาะกับแชท
        'effort' => 'low',
        'max_tokens' => 4000,
        // จำนวนข้อความสูงสุดต่อเครื่องต่อวัน
        'daily_limit_per_client' => 30,
    ],
];
