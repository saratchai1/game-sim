# Field Locker — Ranger character and equipment studio

An incremental upgrade to the action version only. `src/action/character.js` is the one shared character builder for the expedition and its wardrobe preview. The farm renderer, simulation, dependencies and both pre-existing save keys are unchanged.

## Controls

Start the expedition, then press **C** or use **แต่งตัว**. The pause menu also opens the locker. The expedition remains paused while the locker is open. Drag the preview to rotate, scroll to zoom, select front/back, or select an idle/walk preview. **บันทึกและสวมใส่** applies and persists the outfit; Cancel/Escape discards the draft. Opening from the pause screen returns to pause. Returning from a hidden/cached page also requires explicit game Resume.

## Equipment

Eight independently selectable slots and 27 items: headwear, outerwear, trousers, boots, backpack, eyewear, gloves and carried tools. Four outfit presets, six coordinated garment palettes, five skin tones, three hairstyles, four hair colors and three personal saved-look slots. Outfit presets preserve skin/hair identity. All items are freely available cosmetics: no purchases, random loot, stat boosts, online account, multiplayer service or real credits.

The upgraded original procedural character has shaped facial volumes, ears, nose, eyebrows, iris/pupils/highlights and blinking eyes; articulated shoulder/elbow/wrist and hip/knee/ankle groups; collar, zipper, chest pockets, seams, badge, belt, buckles, boot laces, soles and optional equipment geometry. Hats, gloves, eyewear, packs and tools actually change the mesh in the expedition as well as the preview. This remains stylized procedural art, not a photorealistic scanned character.

## Persistence and resource lifecycle

Cosmetics and three custom looks are stored only in `mangrove-ranger-outfit-v1`. Inputs are normalized to an allowlist, successful writes are read back, and failed storage leaves the dialog open without changing the in-world outfit. Custom-look edits are staged until Equip; Cancel discards them. Restarting the expedition does not erase the saved outfit.

Rigid geometry is batched by joint/material. Each avatar owns its geometries/materials, which are disposed once on replacement. Closing the studio disposes its separate renderer, preview model and listeners. The game render loop drives the preview instead of creating another animation loop. The world is not rendered while the studio is visible.

## Validation

`tests/wardrobe.test.js`: cosmetic allowlists, persistence/isolation, preset identity, all-item construction, finite geometry, mesh/triangle budgets, animation joints and disposal ownership. `tests/action-lifecycle.test.js` retains existing regression cases and adds real-controller wardrobe pause/cancel/equip/storage-failure/cache-return tests. `scripts/action-wardrobe-qa.mjs` exercises the production build with desktop and touch viewports, real storage/reload, denied writes, cancel, lifecycle, repeated opening and standalone HTML. Its screenshots/report are stored in `action-artifacts/` by Ranger Action QA. Emulated Chromium is not physical-iPhone validation or a real-GPU performance guarantee.

No Vercel deployment or main-branch merge is part of this upgrade.
