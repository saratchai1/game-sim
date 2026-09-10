# Mangrove Blue Carbon — Game Simulation

เกมจำลองการฟื้นฟูป่าชายเลนแบบ cozy management: ผู้เล่นเลือกพันธุ์ไม้ให้เหมาะกับแปลง ดูแล survival สะสม Estimated Carbon ทำ MRV เพื่อออก Carbon Credit และสร้าง non-carbon benefits ไปพร้อมกัน

## Core loop

1. เลือกพันธุ์ **โกงกาง / แสม / ลำพู**
2. อ่านสภาพแปลงจาก **ระดับน้ำ + ดิน** แล้วปลูกให้เหมาะสม
3. กด **จบวันนี้** เพื่อให้ต้นไม้เติบโต สุขภาพเปลี่ยน และสะสมคาร์บอน
4. รับมือ random events เช่น มรสุม ขยะทะเล community nursery และ wildlife
5. เมื่อ Estimated Carbon >= 3 tCO₂e ส่ง **Drone + Field ตรวจ MRV**
6. ได้ Verified Carbon Credit แล้วเลือกถือหรือขายเพื่อนำเงินกลับมาฟื้นฟูพื้นที่
7. เป้าหมายไม่ได้มีแค่ Carbon: ต้องรักษา **Biodiversity + Community + Coastal resilience** ด้วย

## MVP features

- 16 restoration plots with tide/soil suitability
- 3 mangrove species with different gameplay traits
- Growth stages, health, survival and failed planting
- Estimated carbon accumulation
- MRV / verification gameplay loop
- Carbon-credit market and project economy
- Biodiversity, community and coastal-resilience scores
- Random event decisions
- Project goals and field activity log
- Nursery upgrades that reduce future planting cost
- Local autosave via `localStorage`
- Responsive desktop/mobile UI

## Run locally

```bash
npm install
npm run dev
```

Production build check:

```bash
npm run build
```

## Development status

The playable prototype lives on branch:

`feat/mangrove-blue-carbon-mvp`

**Deployment is intentionally not configured. Do not deploy this repository to Vercel yet.**

## Simulation disclaimer

Carbon accumulation, verification rates, market price, species suitability and non-carbon scores in this MVP are simplified game mechanics. They are not a carbon-credit methodology, ecological prescription, or calculation for real project issuance.
