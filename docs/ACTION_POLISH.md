# Expedition guidance and camera polish

Scope: `/action/`, continuing `feat/mangrove-ranger-action` and PR #14. Farm code, expedition rules, outfit catalog, dependencies, save keys, and deployment configuration are unchanged.

## Player-visible additions

- Camera-relative gold objective arrow, a discreet in-world destination beacon and compass headings that follow the camera.
- Guidance checks the species actually required next, sends the ranger to debris before a blocked planting site, and selects a nearby mature unsampled tree for evidence.
- Advisory waypoints guide creek crossings over the existing western raised bridge. This is guidance, not autopilot or a general collision-free pathfinding guarantee.
- Early warnings: coastal storm countdown, remaining storm time, shelter protection, low stamina, mud, creek crossings, and a nearby visible fallen trunk. All durations are game seconds.
- Q or the accessible 44px recenter button returns the camera behind the ranger and releases held controls. No movement/interaction is performed automatically.
- Finite-segment trunk collision replaces discrete camera samples. Camera retracts immediately on detected trunk/roof obstruction, then eases outward. Existing player collision remains unchanged.
- Subtle sprint field-of-view easing and a short interaction-success ring. Both are suppressed when reduced motion is requested. These do not award resources.

## Structure

`guidance.js` and `camera-safety.js` are pure tested functions. `field-guide.js` owns its presentation objects/DOM and is driven by the existing animation loop. It never writes storage. It survives cached-page transitions and is disposed on a final page exit, alongside the world.

## Validation

`tests/action-guidance.test.js` covers guidance decisions, non-mutation, both bridge directions, compass orientation, weather/obstacle advice, and finite camera intersections. Existing lifecycle tests retain their assertions and add recenter/guide disposal checks; their new presentation boundary is stubbed just like the world/wardrobe boundaries.

`scripts/action-guide-qa.mjs` checks the actual production app in Chromium, including camera drag/recenter, fixtures for a blocked site across the creek, pre-storm warnings, mature evidence targeting, touch recenter and unobstructed controls in portrait/landscape. These later fixtures do not claim a fresh end-to-end human playthrough. Original action and wardrobe suites still run. The guide has no new render loop, external assets or dependencies.
