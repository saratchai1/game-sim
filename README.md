# Mangrove Bay 3D

เกมจำลองการฟื้นฟูป่าชายเลนแบบ interactive 3D: เลือกพันธุ์ไม้ให้เหมาะกับระดับน้ำและดิน ดูการเติบโตในฉากสามมิติ สะสม Estimated Carbon ส่ง Drone + Field ตรวจ MRV เพื่อออก Verified Carbon Credit และบริหาร Non-carbon Benefit ไปพร้อมกัน

## Visual direction

เวอร์ชัน 2 เปลี่ยนจากหน้าตาแบบ card/board game เป็นโลกชายฝั่ง 3D แบบ isometric ที่หมุนและซูมได้ โดยใช้ procedural low-poly geometry ทั้งหมด:

- แปลงปลูก 3D จำนวน 16 แปลง
- โกงกาง แสม และลำพูที่มีรูปทรงและระยะการเติบโตต่างกัน
- รากค้ำยัน รากหายใจ เรือนยอด และต้นที่ไม่รอด
- น้ำ เกาะชายฝั่ง หมู่บ้าน เรือนเพาะชำ MRV Lab โดรน ท่าเรือ เรือ เมฆ และเงาแบบ real-time
- UI สีสดแบบเกมบริหารฟาร์ม แต่เป็นงานออกแบบต้นฉบับสำหรับโครงการป่าชายเลน
- ไม่มีภาพที่สร้างด้วย AI ไม่มีโมเดลหรือ asset ที่คัดลอกจากเกมเชิงพาณิชย์

## Core loop

1. เลือก **โกงกาง / แสม / ลำพู** จาก Nursery dock
2. คลิกแปลงในฉาก 3D เพื่อปลูกตาม **ระดับน้ำ + ชนิดดิน**
3. กด **จบวันนี้** เพื่อให้ต้นไม้โต สุขภาพเปลี่ยน และสะสมคาร์บอน
4. บำรุงแปลง รับมือมรสุม น้ำหนุน ขยะทะเล และเหตุการณ์ชุมชน
5. เมื่อ Estimated Carbon ถึงเกณฑ์ ส่ง **Drone + Field MRV**
6. รับ Verified Carbon Credit แล้วถือหรือขายในตลาด
7. อัปเกรด Nursery, MRV Lab และ Community Team
8. ทำ Living Coast Standard ให้ครบทั้ง Carbon, Biodiversity, Community, Coastal Resilience และ Survival

## Features

- Orthographic isometric camera พร้อม rotate / zoom
- Procedural 3D world ด้วย Three.js + React Three Fiber
- Tide/soil suitability สำหรับพันธุ์ไม้ 3 ชนิด
- Growth stage, health, survival, maintenance และ replanting
- Estimated Carbon → MRV → Verified Carbon Credit
- Carbon market และเศรษฐกิจโครงการ
- Biodiversity, Community และ Coastal-resilience scores
- Random decision events 6 แบบ
- Building upgrades 3 สาย ระดับละ 3 ขั้น
- Story campaign 4 บท และเงื่อนไขจบ Living Coast Standard
- Browser autosave แยกสำหรับเวอร์ชัน 3D
- Responsive desktop/tablet/mobile UI
- WebGL fallback message

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Simulation disclaimer

Carbon accumulation, verification rate, market price, species suitability และ Non-carbon Benefit ในเกมเป็นค่าจำลองเพื่อ gameplay ไม่ใช่วิธีการคำนวณเครดิตจริง คำแนะนำการปลูกจริง หรือผลการรับรองโครงการ
