# Mangrove Bay — 3D Blue Carbon Game

เกมจำลองการฟื้นฟูป่าชายเลนในมุมมอง **3D isometric** แบบเกมฟาร์ม ผู้เล่นหมุนและซูมพื้นที่จริงในฉาก 3D เลือกพันธุ์ไม้ให้เหมาะกับดินและระดับน้ำ ดูแลอัตรารอด สะสม Estimated Carbon ทำ MRV เพื่อออก Verified Carbon Credit และสร้าง non-carbon benefits ไปพร้อมกัน

## Current visual direction

- Full-screen 3D coastal world rendered with Three.js
- Orthographic isometric camera พร้อม rotate, pan และ zoom
- Procedural low-poly mangrove trees, prop roots, water, mudflats, nursery, houses, dock, boat, drone, people และ wildlife
- Growth stage, species, health, failure และ selected state มองเห็นได้โดยตรงในโลก 3D
- อาคาร ทีมภาคสนาม แนวลดแรงคลื่น ปู และปลา ปรากฏเพิ่มขึ้นเมื่อโครงการพัฒนา
- UI เกมฟาร์มสีสดแบบ original พร้อมป้ายไม้และ floating HUD
- ไม่ใช้ภาพ โลโก้ โมเดล หรือ proprietary asset จากเกมเชิงพาณิชย์อื่น

## Core loop

1. เลือก **โกงกาง / แสม / ลำพู** จาก Community Nursery
2. หมุนหรือซูมฉาก แล้วคลิกแปลงดินในโลก 3D
3. ปลูกให้เหมาะกับ **ระดับน้ำ + ชนิดดิน**
4. กด **จบวันนี้** เพื่อให้ต้นไม้เติบโต เปลี่ยนสุขภาพ และสะสม Estimated Carbon
5. รับมือเหตุการณ์ เช่น มรสุม ขยะทะเล การกัดเซาะ และการร่วมมือกับชุมชน
6. ส่ง **Drone + Field MRV** ก่อนเปลี่ยน Estimated Carbon เป็น Verified Carbon Credit
7. ถือหรือขายเครดิตเพื่อนำเงินกลับมาพัฒนา Nursery, Drone MRV และทีมภาคสนาม
8. สร้างสมดุลระหว่าง **Carbon + Biodiversity + Community + Coastal resilience**

## Playable systems

- 16 interactive restoration plots
- 3 mangrove species พร้อม gameplay trait และรูปทรง 3D ต่างกัน
- Seedling, young, mature และ failed-tree visual stages
- Health, maintenance, replanting และ survival rate
- Estimated Carbon → MRV → Verified Carbon Credit
- Credit inventory และราคาตลาดที่เปลี่ยนรายวัน
- Biodiversity, Community และ Coastal-resilience scores
- 6 random decision events
- 3 upgrade paths ระดับละ 3 ขั้น พร้อมการเปลี่ยนแปลงที่เห็นได้ในโลก 3D
- 4 story chapters, 6 achievements และ Living Coast completion grade
- First-play tutorial และ browser autosave
- Save migration จากเกมรุ่น v1/v2
- Responsive desktop, tablet และ mobile HUD

## Living Coast Standard

Campaign สำเร็จเมื่อผู้เล่นทำครบ:

- ต้นไม้รอด >= 12 ต้น
- ต้นโตเต็มที่ >= 8 ต้น
- Verified Carbon สะสม >= 25 tCO₂e
- Biodiversity >= 45
- Community >= 35
- Coastal resilience >= 35
- Survival rate >= 70%

## Run locally

```bash
npm install
npm run dev
```

Production build check:

```bash
npm run build
```

## Branch and deployment

งานปรับเป็น 3D พัฒนาอยู่ที่:

`feat/mangrove-blue-carbon-mvp`

Pull request เป้าหมายคือ `main` แต่การแก้ไขนี้ **ไม่ได้สั่ง deploy Vercel** และยังไม่ควร merge เข้า `main` จนกว่าจะตรวจเวอร์ชัน 3D เรียบร้อย

## Simulation disclaimer

Carbon accumulation, verification rates, market price, species suitability และ non-carbon scores เป็นค่าจำลองสำหรับ gameplay เท่านั้น ไม่ใช่ carbon-credit methodology, ecological prescription หรือค่าที่ใช้สำหรับการออกเครดิตจริง
