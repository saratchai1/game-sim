# Mangrove Ranger — separate third-person action prototype

## Which version is this?

Repository: `saratchai1/game-sim`

Working branch: `feat/mangrove-ranger-action`

Base: `main` at `4362013638c859cbc73deaafe95083bc35704881` (the current main read when work started, not an old development branch).

- `/` remains the existing isometric farm game. Its entry point, source files and save keys are unchanged.
- `/action/` is the new third-person expedition. Entry: `action/index.html` → `src/action/main.js`.
- Action save: `mangrove-ranger-action-v1`; never reads or writes farm saves.
- New branch auto-deployment is disabled by its explicit `git.deploymentEnabled` entry. No merge or manual deployment is required for testing.

## Run

```sh
npm ci
npm run dev -- --host 0.0.0.0
# Open http://localhost:5173/action/
npm test
npm run build
npm run preview -- --host 0.0.0.0
# Production build: http://localhost:4173/action/
```

The standalone artifact `Mangrove-Ranger.html` can be opened in a desktop browser without a server or external assets. The “farm” link only works when served alongside the original repository. Browser file previews on phones may not execute JavaScript; use the local server on the same LAN for phone testing. LocalStorage availability for file URLs varies; a visible warning indicates when progress cannot be saved.

## Mission

Become a coastal restoration ranger. Obtain seedlings, explore the mangrove trail, clear three debris piles and plant six marked sites with the matching species. Revisit growing trees after 22 gameplay seconds to collect three evidence samples. Return to the MRV terminal at base camp to complete the mission and issue six **fictional game credits**. Restored sites visibly grow. Biodiversity, community and coastal indicators rise independently of the credit counter.

## Obstacles implemented

1. **Fallen trunks:** solid collision; jump over or navigate around them.
2. **Deep mud:** reduced movement and stamina drain; stop on safe ground to recover.
3. **Changing tides and deep water:** water level changes over a 96-second game cycle. Deep water drains stamina/health. The raised western bridge is a safe route across the creek.
4. **Coastal storms:** occur during seconds 105–131 in a 160-second cycle. Shelter at camp or the field cache protects the ranger. No unavoidable failure timer.
5. **Fishing nets and plastic:** clear debris near affected planting sites before planting.
6. **Site suitability and limited supplies:** choose the appropriate species with 1/2/3; refill at either supply cache. Wrong choices are blocked with a specific explanation, not silently charged.

Health exhaustion returns the player to camp without deleting planting or evidence progress. The pause menu also offers an explicit rescue button to prevent getting trapped. New-game reset requires confirmation and affects only the action save.

## Controls

- WASD / arrow keys: camera-relative movement.
- Shift: sprint; Space: jump.
- Mouse drag: look; wheel: camera distance; optional mouse lock from the top-right control.
- 1, 2, 3: select species.
- Hold E while stationary: receive supplies, clear litter, plant, collect evidence or verify, depending on proximity.
- Escape: pause. Backgrounding/blur releases controls and pauses the simulation.
- Touch: left joystick; drag the world to look; hold action/sprint buttons and use jump. Portrait and landscape layouts include safe-area insets.

## Implementation and tests

`simulation.js` is deterministic and renderer-independent. `world.js` builds original procedural geometry with instanced foliage, a third-person animated ranger, simple camera collision, water and weather. `main.js` uses a bounded fixed-step loop, independent persistence and input cleanup. All app dependencies stay unchanged.

`tests/action.test.js` covers movement, diagonal normalization, pause, sprint, jump, log collision, mud, tides/bridge, storms, interaction guards, supplies, planting, debris, samples, completion, rescue and malformed saves.

`Ranger Action QA` builds both entries and a self-contained HTML, then captures desktop, developed forest, phone portrait, phone landscape and completion views. The browser progression checks use isolated fixture saves for later planting and verification scenarios; they are not a claim that a human has manually traversed the whole map. The workflow publishes its exact `qa-report.json` and screenshots. It has read-only repository permissions and never rewrites source or deploys anything.

## Scope

This is a playable **stylized procedural prototype**, not photorealistic or commercial-production art matching the reference screenshot. No generated AI images, copied characters, commercial-game assets, runtime CDN downloads or combat mechanics are used. The screenshot reference guided the third-person camera, atmosphere and exploration direction, not asset copying.

Growth, species suitability and impact values are simplified game rules, not ecological recommendations or carbon methodology. The accelerated growth timer is explicitly fictional. Credits are not real offsets, financial assets or issued carbon credits.
