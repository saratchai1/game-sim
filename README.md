# Mangrove Bay — Blue Carbon Restoration Game

เกมจำลองการฟื้นฟูป่าชายเลนแบบ cozy management / farm game ผู้เล่นเลือกพันธุ์ไม้ให้เหมาะกับพื้นที่ ดูแลอัตรารอด สร้าง Carbon Value และ Non-carbon Benefit แล้วพัฒนาโครงการจนผ่าน **Living Coast Standard** ภายในเกม

> UI ใช้บรรยากาศเกมฟาร์มการ์ตูนสีสดเป็นแรงบันดาลใจ แต่ไม่ได้ใช้โลโก้ ภาพ หรือ asset ของเกมเชิงพาณิชย์อื่น

## Core loop

1. เลือกพันธุ์ **โกงกาง / แสม / ลำพู**
2. อ่านสภาพแปลงจาก **ระดับน้ำ + ดิน** แล้วปลูกให้เหมาะสม
3. กด **จบวันนี้** ให้ต้นไม้เติบโต เปลี่ยนสุขภาพ และสะสม Estimated Carbon
4. ดูแลแปลงที่สุขภาพต่ำ และรับมือเหตุการณ์ชายฝั่ง / สภาพอากาศ / ชุมชน
5. เมื่อ Estimated Carbon >= **5 tCO₂e** ส่ง **Drone + Field MRV**
6. MRV เปลี่ยน Estimated Carbon เป็น **Verified Carbon Credit**
7. ถือหรือขายเครดิต แล้วนำเงินกลับมาปลูก ดูแล และอัปเกรดโครงการ
8. รักษา **Biodiversity + Community + Coastal resilience** ให้สมดุล
9. ทำเงื่อนไข Living Coast Standard ให้ครบเพื่อจบ campaign

## Finished gameplay features

- 16 restoration plots พร้อม tide / soil suitability
- 3 mangrove species และ gameplay trait ต่างกัน
- Growth stages: seedling → young → mature
- Health, survival และ failed planting
- Plot maintenance และ replanting
- Estimated carbon accumulation
- Drone + Field MRV และ verification factor
- Verified Carbon Credit inventory
- Carbon market พร้อมราคาที่เปลี่ยนรายวัน
- รายได้ชุมชนเมื่อ Community score พัฒนา
- Biodiversity, Community และ Coastal-resilience impact system
- Species-diversity bonus
- 6 random-event scenarios พร้อม decision / trade-off
- 3 project upgrades: Community Nursery, Drone MRV, Field/Community Team
- 4 restoration story chapters พร้อม reward
- 6 achievements
- Living Coast Standard จำนวน 7 เงื่อนไข
- End-game result / Project Grade และ Sandbox หลังจบเกม
- Emergency recovery grant เพื่อป้องกัน save ติดทางตัน
- First-play tutorial และ replay tutorial
- Field activity log
- Browser local autosave พร้อม migration จาก save v1
- Responsive desktop / tablet / mobile UI
- GitHub Actions production-build validation

## Living Coast Standard

Campaign สำเร็จเมื่อผู้เล่นทำครบ:

- ต้นไม้รอด >= 12 ต้น
- ต้นโตเต็มที่ >= 8 ต้น
- Verified Carbon สะสม >= 25 tCO₂e
- Biodiversity >= 45
- Community >= 35
- Coastal resilience >= 35
- Survival rate >= 70%

หลังจบ campaign สามารถเลือกเล่นต่อแบบ Sandbox หรือเริ่มโครงการใหม่

## Run locally

```bash
npm install
npm run dev
```

Production build check:

```bash
npm run build
```

## Development branch

ตัวเกมฉบับปัจจุบันอยู่ที่:

`feat/mangrove-blue-carbon-mvp`

PR: `#1`

**ยังไม่มีการตั้งค่า deploy จากงานนี้ และยังไม่ควร deploy / merge เข้า `main` จนกว่าจะต้องการให้ production integration ทำงาน**

## Simulation disclaimer

Carbon accumulation, verification rate, market price, species suitability, survival behavior และ non-carbon scores เป็นค่าจำลองสำหรับ gameplay เท่านั้น ไม่ใช่ carbon-credit methodology, ecological prescription หรือค่าที่ใช้สำหรับการออกเครดิตของโครงการจริง
