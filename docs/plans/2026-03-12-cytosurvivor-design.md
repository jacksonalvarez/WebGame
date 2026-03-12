# CytoSurvivor - Game Design Document

**Date:** 2026-03-12
**Genre:** 2D Roguelite Survival
**Platform:** Web (Next.js + HTML5 Canvas)
**Art Style:** 8-bit Pixel Art
**UI Reference:** Balatro (colored grid boxes, dark teal palette, pixel typography)

---

## 1. Core Concept

A 2D roguelite survival game where you play as a single-celled organism navigating a hostile microscopic world. Collect nutrients, evolve organelles, and push into increasingly dangerous zones — or die trying and pass your DNA to the next generation.

**Tagline:** Feed. Evolve. Die. Mutate. Repeat.

---

## 2. Core Game Loop (Single Run)

1. **Spawn** at the center of a fixed map (safe zone)
2. **Move** toward food using mouse-follow controls — your cell drifts toward your cursor
3. **Collect food** — each pickup grants energy (ATP) + upgrade points
4. **Energy drains passively** — your cell is always burning ATP. Stop feeding, you die
5. **Upgrade organelles** — open the upgrade screen anytime (game pauses). Spend points + ATP to install/improve organelles
6. **Push outward** — better food is in harder zones, but so are deadlier enemies
7. **Die** — energy hits zero, or an enemy kills you

**Meta Loop (Between Runs):**
- Earn **DNA points** based on food collected (permanent currency)
- Chance of **random mutations** — permanently unlock new abilities
- Spend DNA on a **permanent gene tree**
- Start the next run slightly stronger each time

---

## 3. Energy System (ATP)

ATP is your lifeblood. It's both your health bar and your currency for evolution. This creates constant tension: spend ATP to get stronger, or save it to stay alive longer.

### ATP Mechanics

| Mechanic | Description |
|---|---|
| **Max ATP** | Starts at 100. Increases through leveling (food = XP toward milestones) |
| **Passive Drain** | ATP ticks down constantly (base rate: ~2 ATP/sec). This is your clock |
| **Movement Cost** | Moving burns extra ATP. Faster movement = more burn |
| **Food Restores ATP** | Each food pickup restores a flat amount + bonus based on absorption efficiency |
| **Upgrade Cost** | Installing/upgrading organelles costs a chunk of ATP + **reduces max ATP** for the run |
| **Level System** | Food counts as XP. Hitting thresholds increases max ATP cap, offsetting organelle costs |

### The Core Tension

Each organelle you install lowers your max ATP (takes up physical space in your cell) but improves how efficiently you generate/use energy.

- **Early game:** Fragile, racing between food
- **Late game:** High efficiency, lower max ATP, but sustainable — if enemies don't kill you

**Example:** 100 max ATP → Install Mitochondria (-15 max ATP = 85 max). But Mitochondria reduces passive drain by 20%. Net: drain slower, less buffer. Worth it if you keep feeding.

---

## 4. Organelle Upgrade Tree

Each organelle is a real part of a cell mapped to a distinct gameplay mechanic. Every organelle has 3 levels. Higher levels = stronger effect but more max ATP cost.

### Organelle Table

| Organelle | Real Biology | Gameplay Effect | Max ATP Cost (Lv1/2/3) |
|---|---|---|---|
| **Mitochondria** | Powerhouse — produces ATP | Reduces passive ATP drain (20%/35%/50%) | -15 / -25 / -35 |
| **Flagellum** | Tail for propulsion | Increases movement speed (25%/50%/80%) | -10 / -18 / -28 |
| **Cilia** | Hair-like projections | Increases food collection radius (small/med/large) | -8 / -15 / -22 |
| **Ribosomes** | Build proteins | Reduces organelle upgrade ATP cost (10%/20%/30%) | -5 / -10 / -15 |
| **Endoplasmic Reticulum** | Processes/transports proteins | Increases ATP gained from food (15%/30%/50%) | -12 / -20 / -30 |
| **Cell Membrane** | Controls entry/exit | Reduces enemy damage taken (15%/30%/50%) | -10 / -18 / -28 |
| **Nucleus** | Control center, holds DNA | Unlocks Lv3 upgrades + increases XP gain (20%/40%/65%) | -20 / -35 / -50 |
| **Vacuole** | Storage compartment | Increases max ATP cap (+30/+50/+75) | -5 / -8 / -12 |
| **Lysosomes** | Break down waste/invaders | Contact damage to enemies + absorb energy on kill (10%/25%/40%) | -10 / -18 / -28 |
| **Pseudopods** | Temporary arm extensions | Extended reach to grab food + push enemies back | -8 / -15 / -22 |

### Key Upgrade Strategies

- **Vacuole** — Safety net. Directly adds max ATP to offset other organelle costs
- **Mitochondria + ER** — Efficiency combo. Drain less, gain more per food
- **Nucleus** — Long-term investment. Expensive but gates Lv3 upgrades for everything
- **Lysosomes** — Turns you from prey to predator in late game
- **Flagellum + Cilia** — Mobility build. Reach food faster, collect from further away

---

## 5. Map Design — The Petri Dish

A large fixed square divided into concentric zones radiating from the center. Safe at center, lethal at edges.

### Zone Structure

| Zone | Name | Distance | Food Density | Food Value (ATP) | Enemies | Difficulty |
|---|---|---|---|---|---|---|
| 1 | **Cytoplasm** (Spawn) | 0-15% | High | 5-10 | None | Safe |
| 2 | **Inner Membrane** | 15-35% | Medium | 15-25 | Sparse, slow | Easy |
| 3 | **Outer Membrane** | 35-55% | Medium-Low | 30-50 | Moderate, varied | Medium |
| 4 | **Extracellular Matrix** | 55-75% | Low | 60-100 | Dense, aggressive | Hard |
| 5 | **The Void** | 75-100% | Very Low | 150+ | Elite enemies | Brutal |

### Food Rules

- Food spawns at fixed positions per run (procedurally placed at start from a seed)
- Spacing increases with zone — Zone 1 food is close, Zone 5 requires significant ATP to reach the next piece
- **Food does NOT respawn** — once collected, it's gone. This forces you outward
- Rare **golden food** gives bonus DNA points (meta-currency) + ATP + upgrade points

### Map Features

- **Nutrient Trails** — Faint visual paths between food clusters to guide the player
- **Toxic Pockets** — Small areas that drain ATP faster (avoidable hazards)
- **Membrane Walls** — Semi-permeable barriers between zones. Player can pass through; enemies from outer zones cannot cross inward

---

## 6. Enemies & AI

All enemies roam autonomously using **chemotaxis** — they sense food within a radius and drift toward it. They don't hunt the player (one exception). Collisions are natural, not directed.

### Enemy Types

| Enemy | Based On | Behavior | Threat | Zones |
|---|---|---|---|---|
| **Bacteriophage** | Virus | Floats in straight lines, bounces off walls. Attaches on contact, drains ATP (5/sec) until shaken off via erratic movement | ATP drain over time | 2-3 |
| **Amoeba** | Predatory cell | Drifts toward nearest food. Chases player if nearby AND player is smaller. Engulfs on contact | Heavy burst damage (30-50 ATP) | 3-4 |
| **Paramecium** | Ciliated cell | Moves quickly in sweeping patterns. Doesn't target player but hard to avoid | Moderate damage (15-20 ATP) + knockback | 2-4 |
| **White Blood Cell** | Immune defender | Patrols zone borders. **DOES** target player if they linger too long in one zone. Slow but relentless | Heavy damage + disables random organelle (10 sec) | 3-5 |
| **Toxoplasma** | Parasitic protozoan | Camouflaged near food. Lunges when player approaches. Hijacks movement controls (reverses directions) for 5 sec | Control disruption + light ATP drain | 4-5 |
| **Tardigrade** | Water bear | Massive, slow, blocks paths. Cannot be killed, only avoided. Wanders aimlessly | Crushing damage on overlap (40-60 ATP) | 5 |

### AI Behavior — Chemotaxis Model

- Enemies sense food within a radius and drift toward it at their base speed
- No pathfinding — they move in the general direction with slight random wobble (simulates real cellular movement)
- Enemies can collide with and **eat food themselves**, competing with the player
- Enemies spawn at run start in fixed positions per zone (procedurally placed)
- Only White Blood Cells specifically target the player (on a timer trigger)

---

## 7. UI Design — Balatro-Style

### Color Palette

| Element | Color | Hex |
|---|---|---|
| Background | Dark teal | #1a3a3a |
| Card/tile bg | Dark navy | #1c2333 |
| ATP stat box | Red | #c74b4b |
| Speed stat box | Blue | #4b7bc7 |
| Efficiency box | Orange | #c7944b |
| Upgrade points | Gold | #c7b84b |
| XP/Level box | Purple | #7b4bc7 |
| Text primary | White | #ffffff |
| Text secondary | Cream | #f0e6d0 |
| Positive accent | Bright green | #4bc774 |
| Negative/cost | Red | #c74b4b |

### Typography

- **Font:** "Press Start 2P" (Google Fonts) — authentic 8-bit pixel font
- All text in pixel style. No smooth/anti-aliased fonts anywhere

### In-Game HUD

- **Top-left:** ATP bar (horizontal, green → yellow → red as it depletes) + current/max ATP text
- **Top-right:** Zone indicator in colored box (e.g., "ZONE 3: OUTER MEMBRANE")
- **Bottom-left:** Minimap — full petri dish, player (blinking dot), food (green dots), enemies (red dots)
- **Bottom-right:** Quick stat boxes — Speed, Collection Radius, Efficiency %
- **Center-bottom:** "Press [SPACE] for Upgrades" prompt (fades after first use)

### Upgrade Screen (Pause Overlay)

Opens as full overlay when player presses Space. Game pauses. Dark semi-transparent background over gameplay.

**Layout (3-panel):**

**Left Panel — Player Stats (stacked colored boxes):**
- ATP (green box)
- Speed (blue box)
- Efficiency (orange box)
- Upgrade Points (gold box)
- XP / Level (purple box)

**Center Panel — Organelle Grid (2 rows x 5 columns):**
Each organelle is a square tile showing:
- 8-bit pixel art icon
- Name in pixel font
- Current level (Lv0 / Lv1 / Lv2 / Lv3)
- Cost to upgrade (ATP + points)
- Greyed out if locked or can't afford

**Right Panel — Detail View:**
On hover of an organelle tile:
- Full biological description
- Current effect vs. next level effect
- ATP max reduction warning
- "INSTALL" or "UPGRADE" button

---

## 8. Meta-Progression — The Evolution Lab

After death, the player enters the Evolution Lab screen. Same Balatro-style UI.

### DNA Points (Reliable Progression)

- Earned based on total food collected (1 food = 1 DNA point, bonus for higher-zone food)
- Spent on a **Gene Tree** with branches:

| Branch | Effect |
|---|---|
| **Metabolic Genes** | Start with higher base ATP, slower passive drain |
| **Structural Genes** | Start with Lv1 of a chosen organelle already installed |
| **Adaptive Genes** | Unlock new organelle types (e.g., Pseudopods require gene unlock first) |
| **Efficiency Genes** | Reduce max-ATP cost of all organelles by a flat % |
| **Survival Genes** | "Second wind" — one free death per run, revive with 25% ATP |

### Mutations (Random Discovery)

- After each run, chance to discover a mutation (scales with furthest zone reached)
- Mutations are permanent modifiers — some beneficial, some double-edged
- Player can equip up to **3 active mutations** at a time. Can swap between runs

| Mutation | Effect |
|---|---|
| **Thermophilic** | ATP drain reduced in Zone 4-5, increased in Zone 1-2 |
| **Hyper-flagella** | 30% faster movement, 20% more movement ATP cost |
| **Photosynthetic** | Slowly regenerate ATP when stationary |
| **Endosymbiont** | Start each run with Lv1 Mitochondria, but -15 max ATP |
| **Bioluminescent** | Enemies give wider berth, but food collection radius is smaller |

### Run Summary Screen

Shown after death, before Evolution Lab:
- Food collected (score)
- Furthest zone reached
- Organelles installed
- DNA points earned
- Mutation discovered (if any)
- Personal best comparison

---

## 9. Visual Style

- **Cell rendering:** Soft circular blob with visible organelles inside (colored pixel structures appear as you install them). Cell wobbles slightly while moving
- **Enemies:** Distinct silhouettes and colors per type. Bacteriophage = angular/spiky (purple), Amoeba = blobby (dark green), Paramecium = oval with cilia fringe (yellow), White Blood Cell = large/white, Toxoplasma = small/camouflaged, Tardigrade = massive/brown
- **Food:** Small glowing orbs. Green = standard, Gold = rare/bonus DNA. Pulsing animation
- **Background:** Dark with subtle grid pattern (microscope slide). Gets darker in outer zones
- **Particles:** ATP drain = tiny fading dots leaving cell. Food absorption = sparkle. Damage = red flash
- **Camera:** Follows player cell with slight smoothing. Fixed zoom level

---

## 10. Audio (Minimal Scope for v1)

- **Ambient:** Low, bubbly underwater/microscopic hum. Intensity increases in outer zones
- **SFX:** Food pickup (soft blip), damage taken (wet thud), upgrade installed (chime), death (deflation)
- **Music:** Optional synthwave/chiptune track for Evolution Lab screen

---

## 11. Technical Architecture

| Component | Technology |
|---|---|
| **Framework** | Next.js (already set up) |
| **Rendering** | HTML5 Canvas with `requestAnimationFrame` loop |
| **Game State** | Lightweight state manager outside React (avoid re-render overhead) |
| **Physics** | Simple 2D — circle collision detection, velocity-based movement |
| **Map Generation** | Procedural from seed — food positions, enemy spawns, zone boundaries |
| **Save Data** | LocalStorage — DNA points, mutations, gene tree, high scores |
| **Font** | "Press Start 2P" via `next/font` (Google Fonts) |
| **Controls** | Mouse-follow (cell drifts toward cursor), Space to open upgrades |

---

## 12. Implementation Priority

### Phase 1 — Core Gameplay
1. Canvas game loop with player cell (mouse-follow movement)
2. ATP system (passive drain, display)
3. Food spawning and collection
4. Basic map with zone boundaries

### Phase 2 — Organelle System
5. Upgrade screen UI (Balatro-style)
6. Implement all 10 organelles with 3 levels each
7. ATP cost/benefit calculations

### Phase 3 — Enemies
8. Chemotaxis AI system
9. Implement all 6 enemy types
10. Collision and damage system

### Phase 4 — Meta-Progression
11. Death → Run Summary → Evolution Lab flow
12. DNA points and Gene Tree
13. Mutation discovery system
14. LocalStorage persistence

### Phase 5 — Polish
15. Pixel art sprites for all entities
16. HUD and minimap
17. Audio/SFX
18. Balancing and playtesting
