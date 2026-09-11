# Gameplay next: restoration field station

Base: `main` at `c4528c1dea566864969f90831e2688460f6aeb9d` (PR #6). Also incorporates main `0610c8a`; its screen-space overlay is unmounted because the new scene provides actual 3D workers/wildlife. Legacy overlay helpers and tests are retained.

## Review and choices

| Pain point in the base | Change |
| --- | --- |
| A world click spends money before the player can inspect fit | Select → fit, starting health and cost preview → explicit plant confirmation |
| Days 2–6 are largely an end-day click loop | Two crew jobs/day: cleanup, care, forecast preparation, unlocked habitat surveys |
| Mission and chapter rewards overlap without directing the next action | Keep legacy milestones/saves; mission CTA opens its relevant tool, while optional three-day contracts reward actions after acceptance |
| Rank has little effect on available activities | Visible habitat conditions unlock patrol at three living trees and surveys at three mature trees |
| Random events may repeat and cannot be prepared for | Six-event rotating forecast; persistent patrol preparation and mature roots reduce actual hazard damage |
| Cleanup has little visible effect | Litter fades away after cleanup, protection flags appear, and habitat score adds undergrowth and a habitat marker |
| Sand plots permanently lack a perfect soil match | One-time 40-coin sediment preparation improves fit; preserved in existing v2 saves |
| Always-open side panels obscure the world | Compact objective column, on-demand economy/field station, readable Thai font, SVG tool icons |
| Existing workers are legless wobbling shapes; wildlife drifts without intent | Three original named characters with articulated limbs, faces, tools, work pauses and click-to-wave; task-specific destinations, moving boat, claw/tail animation |
| Daily randomness is embedded in React updates; grass emits five draw calls/tuft | Extract deterministic daily simulation; merge the five grass blades into one mesh; cap DPR and shadow map size |

## One connected loop

Inspect the forecast → accept one restoration contract → allocate two crew jobs → plant suitable species or care for habitat → advance a game day → resolve the forecast event → turn restoration progress into a delivery, wildlife discovery and achievement → reinvest carbon proceeds.

Short goals: choose a perfect-fit plot and allocate today's crew. Medium goals: deliver a three-day contract, grow trees to day six and unlock surveys. Long goals: restore habitat to 80%, collect four achievements and four wildlife entries, and complete the existing Living Coast campaign.

Contracts do not use real-world time. Each tracks a snapshot at acceptance, includes the acceptance day plus two further game days, and pays only once. An expired contract has no financial penalty; it resets the capped delivery streak bonus. The board excludes planting when fewer than two suitable empty plots remain and habitat surveys until they are unlocked. One acceptance per day prevents same-day contract farming. Established forests alternate survey, cleanup and MRV tasks.

Crew work is optional and does not limit planting or paid per-plot maintenance. Cleanup remains free and awards 45 coins, preserving the bankruptcy recovery path. Care heals the three weakest living trees. Patrol applies to the next forecast hazard only; mature Rhizophora roots also reduce damage. Survey trades coins and a crew slot for biodiversity/community/XP. Daily crew use, counters, deadlines, achievements, soil work and protection survive reloads.

## Visual and character direction

All characters, tools, wildlife geometry, icons and water shaders are original code. The inspiration is the general cozy management-game pattern of readable figures doing useful work; no Hay Day assets or code are used. Mali (planting/care), Non (cleanup/patrol), and Ing (survey) walk, pause, work, look around and wave when clicked. Visual jobs are feedback for completed actions, not extra timers that block gameplay.

The sea uses one modest grid and an analytic ripple/glint shader, with tide-height and color interpolation. Rain, gust-driven tree sway and warmer days reuse the existing scene. Surface channels now sit above the terrain bevel instead of being hidden under it. Habitat stages add undergrowth and a marker; cleanup clears shoreline litter temporarily. Crab claws, swimming fish tails, bird wings, drone rotors and a coastal boat animate using elapsed time. Camera focus stops when the player starts manipulating the camera.

The Noto Sans Thai subset is self-hosted (400 and 700 weights, about 23 KB total); its SIL Open Font License is in `public/fonts/OFL.txt`. No runtime dependency was added.

## Architecture

- `game-data.js`: species, events, initial state and shared fit/cost helpers.
- `game-engine.js`: deterministic, immutable daily growth, economy, forecast events and contract expiry.
- `restoration.js`: crew, contracts, habitat, achievements, preparation and migration validation.
- `coast-progression.js`: existing progression and v2 migration, extended for restoration fields.
- `RestorationPanel.jsx`: field station and compact contract/habitat HUD.
- `CoastCharacters.jsx`: original articulated workers and work/idle animation.
- `LivingWater.jsx`: bounded single-surface water shader.
- `MangroveWorld3DNatural.jsx`: world integration, wildlife and merged grass geometry.
- `GameIcon.jsx`, `restoration.css`: original icons, fonts and responsive HUD.

## Verification

`npm test` runs the original nine tests plus twelve restoration/simulation tests. The new tests cover crew limits, bankrupt recovery, unlocks, event blocking, snapshots, duplicate payouts, deadlines, saves, soil, hazard preparation, habitat regression and a fresh-resource progression walkthrough.

`scripts/visual-qa.mjs` now asserts rather than only recording errors. It exercises real canvas selection, preview-before-spend, three-species planting, mission/contract rewards, cleanup, save/reload, six days of growth, a forecast hazard, survey unlock, MRV and sale with earned resources. It checks photo mode, moving character/boat/crab/fish positions, and control bounds at 1440×900, 1024×768, 768×1024 and 390×844. A separately labelled developed-save fixture is used only for restored-world visual checks. Screenshots and `qa-report.json` are emitted to the ignored `visual-qa/` directory and uploaded by the existing Visual QA workflow.

Local QA with Playwright installed: start `npm run dev` and run `node scripts/visual-qa.mjs`. `QA_LOCAL_SERVER=1` starts Vite in the same process/network environment. `QA_BROWSER_PATH` optionally selects an installed Chromium executable. Read-only actor/render diagnostics require both Vite development mode and `?qa=1`; they are not enabled in the production tree.

## Remaining work

- Expand contract variants and authored character conversations only after playtesting the new loop; currently four contract types are intentionally bounded.
- Run hardware FPS profiling on a physical tablet. Headless software-renderer results validate correctness, not real-device frame rates.
- Batch additional static scenery if needed. The renderer still has many individual meshes; grass batching addresses a large identified source.
- Consider lazy-loading the Three.js scene. The production bundle retains Vite's existing large-chunk warning.
- Carbon and ecological numbers remain gameplay approximations, not real credit calculations.

No production deployment or merge is part of this change.
