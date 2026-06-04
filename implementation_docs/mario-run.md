# Mario Chase – Core Structure

Mario Chase is a 2–5 player tag game where one Mario (runner) is chased by up to four Toads (chasers) in a small arena divided into colored quadrants. Mario wins by surviving until the timer expires; the Toads win by tackling Mario once before time runs out.

Key round structure (what you need to implement):

- Pre-round countdown where only Mario can move (10‑second head start).
- Main timer (e.g., 2–3 minutes) visible to all players on the TV.
- Single capture ends the round in the Toads’ favor; timeout ends in Mario’s favor.
- Post‑round win screen and basic stats (winner, time remaining or survived, maybe map replay).

---

## Mario Chase – Roles and Controls

You need two role types with different capabilities, input mappings, and UI.

**Mario (GamePad / runner)**

- Movement: analog movement around the arena (left stick, or WASD/analog in your version).
- View: on Wii U, Mario sees a top‑down map of the entire arena on the GamePad, including all Toads, Yoshi Carts, and the Super Star.
- Objective: survive until the timer hits zero, optionally using terrain and the Super Star to escape.
- Actions:
  - Move.
  - Pick up Super Star when in contact (trigger power‑up state).

**Toads (Wii Remote / chasers)**

- Movement: movement via D‑pad/analog; slightly faster base run speed than Mario to make captures possible.
- View: third‑person, over‑the‑shoulder chase camera focused on each Toad, shown on the TV.
- Objective: coordinate with other Toads and Yoshi Carts to corner and tackle Mario.
- HUD: distance readout to Mario (e.g., "12 m") but no exact direction or full map view.

For your implementation:

- Keep Mario's **top‑down tactical view** as a dedicated 2D map (can be its own canvas or overlay).
- Give each Toad a **3D‑style over‑the‑shoulder camera** with a configurable FOV and height that only shows local surroundings plus HUD distance.

---

## Mario Chase – Cameras and UI

The asymmetric camera setup is central to the design.

**Mario camera and UI**

- Top‑down orthographic view of entire arena, always showing:
  - Mario icon (distinct color, e.g., red).
  - Each Toad icon (blue, green, yellow, purple).
  - Yoshi Carts (if present).
  - Super Star icon when spawned.
- Map divided into four clearly colored zones (e.g., red, blue, green, yellow) matching the arena floor colors on the TV.

**Toad camera and UI**

- Over‑the‑shoulder camera behind each Toad, pitched down to show:
  - The Toad character.
  - Nearby obstacles and floor color ahead.
- HUD elements:
  - Global round timer.
  - Distance to Mario, updated every frame.
  - Optional text hint when Yoshi calls out (“Mario spotted in BLUE zone!”).
- No mini‑map for Toads, to preserve the asymmetry.

Implementation notes:

- Color quadrants in the level geometry and also label them in UI (“Blue Zone”, etc.).
- Implement a shared “computeDistanceToMario(playerPosition)” function and re‑use it in all Toad HUDs.

---

## Mario Chase – Yoshi Carts and Assists

Yoshi Carts assist when there is only one human Toad.

**Spawn and role**

- Condition: if human Toad count == 1, spawn two CPU‑controlled Yoshi Carts; otherwise none.
- Movement:
  - Patrol the arena on simple paths.
  - Regularly query Mario’s position and drift toward him over time.
- Interaction with Mario:
  - On collision with Mario’s hitbox, briefly stun/slow Mario and play a hit effect.

**Communication / hints**

- When a Yoshi is close enough to Mario (within a detection radius), trigger:
  - A callout that shows which color zone Mario is in.
  - Optional on‑screen arrow or voice line.
- These hints are crucial when a single human is chasing.

Implementation detail:

- Treat Yoshi Carts as simple AI agents with “patrol → home in on Mario’s zone → resume patrol” states.
- When they collide with Mario, apply a short “stunned” state (reduced movement speed or small knockback).

---

## Mario Chase – Power‑ups and Timers

The main power‑up is the Super Star.

**Head start**

- Mario can move immediately when the round starts.
- Toads and Yoshi Carts are frozen until the countdown reaches zero (10‑second head start).

**Super Star mechanics**

- Spawn: appears in the center of the arena after 30 seconds of elapsed time.
- Visibility: shown on Mario’s map as a star icon and visible as a physical object in the world.
- Pick‑up effect on Mario:
  - Increased movement speed for a short duration.
  - Invulnerability to tackles and Yoshi hits.
  - Colliding with Toads/Yoshis knocks them back and possibly stuns them briefly.
  - Star effect has a clear visual (glow) and sound.

Implementation:

- Represent power‑ups as timed buffs on the Mario entity.
- Use a simple finite‑state machine: normal → starPowered (with duration timer) → normal.

---

## Mario Chase – Arenas and Terrain

There are three arena types; you can capture their essential gameplay differences rather than every cosmetic detail.

**Chase Arena**

- Simple flat arena, four color‑coded quadrants.
- Minimal obstacles; ideal baseline layout.
- Two size variants based on player count (1–2 Toads vs. 3–4 Toads).

**Mud River Run**

- Multiple mud trenches across the arena.
- Mechanics:
  - Moving through mud slows both Mario and Toads significantly.
  - Mario under Super Star is not slowed by mud.
- Bridges connect quadrants across mud:
  - Mario crossing a bridge causes it to collapse permanently; Toads can cross indefinitely before collapse.
  - After collapse, that bridge becomes unusable, forcing pathing through mud.

**Slide Hill**

- Terrain with slopes/ramps.
- Mechanics:
  - Moving downhill increases speed.
  - Moving uphill decreases speed.
  - Flat areas behave normally.

Implementation notes:

- Represent mud as tiles with a movement‑slow modifier.
- Implement bridges as entities with a state: intact → collapsing animation → destroyed (no collision).
- For Slide Hill, apply a speed multiplier based on terrain gradient direction vs movement vector.

---

## Mario Chase – Scoring, Feedback, and Round End

To capture the feel, you need dramatic feedback.

**Capture and win conditions**

- Capture happens if any Toad’s tackle hitbox overlaps Mario’s body hitbox.
- On capture:
  - Freeze all players.
  - Play a short slow‑motion zoom shot focused on the capture.
  - End the round with Toads as winners.

**Timeout win**

- If timer hits 0 without capture, Mario wins.
- Show celebratory feedback for Mario and “Mission failed” style feedback for Toads.

**Replay / overview**

- Original shows Mario’s escape path and near misses.
- Implementation idea: record Mario’s positions periodically, then play them back as a trail on the top‑down map after round end.

**Stats and UI**

- Show: winner, total time survived or time remaining, number of captures (usually 1), maybe Yoshi hits.
- For multiple rounds, keep per‑player win counts.

## Summary of “Exactly What Needs to Be Implemented”

Here is an at‑a‑glance checklist you can turn into issues/tasks:

### Mario Chase – Must‑Have

- Role system: Mario vs Toads (support 2–5 players).
- Cameras:
  - Mario: full top‑down arena map.
  - Toads: per‑player third‑person chase camera on TV.
- Asymmetry rules:
  - Mario sees all; Toads only see their local space plus distance to Mario.
- Arena system: three arenas with:
  - Colored quadrants and appropriate obstacles.
  - Mud slow tiles and collapsible bridges (Mud River Run).
  - Slopes affecting speed (Slide Hill).
- Yoshi Carts: CPU helpers for single Toad, with stun and zone callouts.
- Super Star: timed spawn, buffed Mario movement, invulnerability, knockback.
- Round logic: head start, capture detection, timeout, win screen, optional replay.
