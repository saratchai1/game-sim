# Original worker character polish

Branch: `feat/worker-character-polish`, created from `main` at `0610c8a`, then incorporating the gameplay/living-world baseline in PR #8. Until that PR is merged, this PR intentionally includes those prerequisites. Neither branch changes production or merges main.

## Model and architecture

The three workers now have an individually modelled head, neck, tapered torso, shoulders, upper arms, elbows, forearms, hands/thumbs, hips, thighs, knees, shins, boot shafts, toes and soles. Faces add brows, eyes, cheeks and noses. Shirts, pocketed vests, belts/buckles, utility bags, trousers and boots replace the capsule silhouette. Three original variants use straw, bucket and cap hats, distinct colors/skin tones and small height/width differences.

- `WorkerCharacter.jsx`: articulated hierarchy, travel/arrival/work state, smooth joint application.
- `WorkerProp.jsx`: seedling tray/shovel, trash bag/picker, notebook/binoculars, tablet/controller, watering can/toolkit.
- `WorkerAnimationPose.js`: deterministic idle/walk/plant/cleanup/inspect/maintain/MRV poses and frame-rate-independent blending.
- `WorkerShape.jsx`: five shared low-resolution primitive geometries and a bounded color/material cache.
- `workerVariants.js`: original variants, action-to-worker mapping and a no-hit picking function.
- `CoastCharacters.jsx`: small world integration component.

Successful planting, cleanup, clearing, crew/per-plot maintenance, surveys/patrols and MRV dispatch explicit actions from `App.jsx`. Reading a notice or clicking a disabled action does not start a job. Assigned workers carry the corresponding equipment, walk to the relevant destination, perform the work for six seconds after arrival, then return to their ambient route. Idle workers do not repeatedly mime tasks that the player never requested. New orders replace a worker's current visual order without changing any gameplay reward or clock.

## Interaction and performance

Every worker body/prop mesh opts out of raycasting, and name labels use `pointer-events: none`. Workers no longer consume clicks to wave: preserving plot interaction takes priority. Camera controls and plot selection continue underneath them. No third-party model, commercial-game asset, or new runtime dependency is added.

Animations update refs in `useFrame`, not React state per frame. Hidden equipment remains mounted to avoid action-time construction; only the active job's equipment renders. Geometry and material sharing bounds allocations across characters, and the gameplay baseline's grass batching/shadow/DPR limits remain. Physical-device FPS still needs profiling; software Chromium is used for correctness.

## Verification

- `npm test`: 30 tests, including all original, living-world, restoration, and four new worker tests.
- New tests check action/tool dispatch, all seven distinct finite poses, joint availability, frame-rate-independent blending and no-hit picking.
- `npm run build`: production compilation; the existing Three.js chunk-size advisory remains.
- Visual QA exercises actual successful game actions until cleanup, plant, maintain, inspect and MRV poses are reached, and captures each pose.
- Live scene diagnostics check required named body parts and zero worker raycast hits, in addition to existing full-loop, animation, save/reload, console and responsive-layout checks.
- QA captures desktop and landscape/portrait tablet plus phone widths. Screenshots/reports are generated locally or by the existing Visual QA workflow, not committed as build output.

Future polish: hand-to-tool grip adjustments for more poses, authored arrival paths around obstacles, and physical tablet performance measurements. The original low-poly style is intentionally preserved.
