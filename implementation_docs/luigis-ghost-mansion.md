# Luigi’s Ghost Mansion – Core Structure

Luigi’s Ghost Mansion is a 2–5 player asymmetrical game where one ghost (GamePad) hunts up to four “ghost trackers” (Luigi, Mario, Wario, Waluigi) in a dark mansion with flashlights. Humans win by depleting the ghost’s health with their flashlights, while the ghost wins by making all humans faint before time expires.

Key round rules:

- Timer: typically 5 minutes.
- Ghost starts invisible on the TV after lights go dark.
- Humans lose a "life" each time they faint; they can be revived by teammates.
- Win conditions:
  - Ghost health reaches 0 → humans win.
  - All trackers faint simultaneously → ghost wins.
  - Timer reaches 0 with both sides still active → tie.

---

## Luigi’s Ghost Mansion – Roles and Controls

You need two role types: Ghost (GamePad) and Ghost Trackers (hunters).

**Ghost (GamePad player)**

- Movement:
  - Uses analog stick or touch screen to move freely around the top‑down mansion.
- Actions:
  - Dash (short burst of speed).
  - Charge and release a special “magic spell” that drains trackers’ flashlights and stuns Monita robots.
- Objective: make all ghost trackers faint before the timer runs out.

**Ghost Trackers / Hunters (Wii Remote players)**

- Characters: Luigi (P1), Mario (P2), Waluigi (P3), Wario (P4).
- Movement: via D‑pad/analog (sideways Wii Remote originally).
- Actions:
  - Turn or flick flashlight using a button (originally 1 button).
  - Sidestep using another button (originally 2 button).
- Objective: cooperate to reveal and drain the ghost’s health to zero using flashlights, while reviving fainted teammates and managing battery.

For your design constraint:

- You want everyone in **top‑down 2D view**.
  - Ghost: always sees full mansion top‑down with all trackers visible.
  - Hunters: see a partially lit top‑down map, with their own cone of light and teammates, but **cannot see the ghost normally**.

---

## Luigi’s Ghost Mansion – Visibility and Sensing Rules

Your specified visibility rules align with the original design: hunters do not see the ghost except at specific moments.

Implement these conditions:

- Hunters **cannot see the ghost** most of the time on the TV.
- Hunters **can see the ghost** only when:
  - The ghost **dashes**.
  - The ghost is **grabbing or carrying a hunter** (during a fainting attack).
  - A **lightning strike** illuminates parts of the mansion, revealing the ghost if it is within the flashed area.
- Ghost can **always see** the entire map and all trackers on their top‑down GamePad view.

Additional sensing:

- When the ghost is near a hunter, that hunter's controller vibrates; in your version you can simulate this with:
  - Screen shaking or glow on the hunter HUD.
  - On‑screen text hint like “It’s close!” that scales with proximity.
- Hunters must use these hints plus lightning flashes and teammate calls to locate the ghost.

---

## Luigi’s Ghost Mansion – Ghost Abilities

The ghost has three main mechanics: invisible movement, dash, and special spell.

**Invisible movement**

- Ghost moves freely but is only visible to hunters under specific triggers (dash, lightning, grab, spell charge).
- Ghost is fully visible on their own screen at all times.

**Dash**

- Activated via a button (e.g., A).
- Temporarily increases ghost speed.
- Makes the ghost visible on the hunters’ screen during the dash, giving away position.
- Has a cooldown or limited duration.

**Magic spell (purple smoke attack)**

- Charge: ghost holds a button to charge a spell; while charging, the ghost becomes visible, telegraphing their position.
- Release:
  - Emits an area‑of‑effect that **drains trackers’ flashlight batteries to zero** if they are caught in the blast.
  - Stuns CPU Monita helpers briefly.
- Cooldown: once used, the ghost must wait before charging again.

**Attack / grab**

- The ghost “attacks” simply by touching a tracker:
  - On contact, the tracker enters a “fainting” state and falls down.
  - The hunters see the ghost briefly visible as it grabs and drops the tracker.
- The ghost must repeat this until all hunters are fainted simultaneously to win.

Implementation details:

- Represent ghost invisibility as “not drawn” in hunters’ view unless visibleFlag is true.
- Manage visibilityFlag via events: dash start/stop, lightning flash, grabbing, spell charging.

---

## Luigi’s Ghost Mansion – Hunter Mechanics

Hunters have flashlights, battery management, life counters, and revive actions.

**Flashlights**

- Each hunter projects a cone of light in the direction they face.
- If the ghost is in this cone while visible or overlapping, the ghost takes damage and is briefly stunned.
- Hunters can flick their flashlight on/off or sweep it around to search (in original: "flicker flashlight" is separate from basic aim, but you can simplify).

**Battery system**

- Each hunter’s flashlight has a battery meter:
  - Battery slowly drains while flashlight is on.
  - Turning off the flashlight stops the drain.
- Batteries spawn around the stage:
  - Normal batteries restore a portion of battery when picked up.
  - Gold or “special” batteries occasionally spawn when hunters are low or losing badly, giving:
    - Full battery refill.
    - Temporarily stronger flashlight: longer range and more damage per tick to the ghost.
    - Faster revive speed on fallen allies.

**Lives / fainting**

- Life counts scale with player count:
  - 1 hunter: 3 lives.
  - 2 hunters: 2 lives each.
  - 3–4 hunters: 1 life each (values from original).
- Fainting:
  - When ghost touches a hunter, that hunter “faints”: they collapse and cannot move or shine their flashlight.
  - They remain on the floor at that position until revived or until the team loses if all are down.

**Reviving teammates**

- Other hunters can revive a fainted ally by shining their flashlight onto them for a certain duration.
- While reviving, they are vulnerable to ghost attack; teamwork is important so others can cover the reviver.
- Gold battery buff reduces revive time significantly.

Implementation details:

- Represent fainted hunters as entities with state = “downed”; they cannot move or turn.
- Track “reviveProgress” when a teammate’s flashlight cone overlaps a downed hunter; progress accumulates over time.
- Once reviveProgress reaches threshold, set state back to normal and restore some portion of battery/life.

---

## Luigi’s Ghost Mansion – Assist Characters (Monita)

If there are fewer than four human hunters, the game fills remaining slots with CPU‑controlled Monita robots.

Required behavior:

- Monita acts like a hunter with a flashlight beam that can damage the ghost.
- Monita cannot be defeated by the ghost (no fainting); they are only briefly stunned by the ghost’s magic spell.
- Monita swings its light in circles or arcs when the ghost is near, trying to reveal it.

Implementation simplification:

- Give Monita a simple AI:
  - Roam around near human players.
  - Periodically check ghost distance and spin flashlight rapidly when close.
  - Avoid staying isolated.

---

## Luigi’s Ghost Mansion – Stages and Layouts

There are five stages, each with unique layout but similar core rules.

From StrategyWiki and Fandom summaries:

- **Main Floor**
  - Simple first‑floor layout, medium size.
  - Few obstacles; good beginner map.

- **Basement**
  - More walls and tighter corridors.
  - Encourages cornering and ambushes.

- **Research Lab**
  - Features narrow hallways and special rooms, more maze‑like.

- **Storage Room**
  - More cluttered, with obstacles and dead ends.

- **Monita’s Rooftop**
  - Open rooftop with limited cover; more exposed, more lightning‑revealed areas.

General stage features to implement:

- Narrow corridors and larger rooms to create varied line of sight.
- Spawn points for:
  - Hunters (clustered, but not all in the same tile).
  - Ghost (some distance away).
  - Battery pickups (predefined spawn locations, random selection).
- Lightning windows:
  - Certain tiles or edges count as “windows”; lightning flashes illuminate nearby tiles.

---

## Luigi's Ghost Mansion – Lightning System

Lightning is a key global visibility mechanic.

Implementation details:

- Lightning strikes occur at random intervals (with minimum and maximum delay).
- When lightning strikes:
  - A portion of the map is illuminated briefly on the TV (e.g., all tiles tagged as "window adjacent").
  - If the ghost is in lit tiles during this moment, the ghost is drawn and visible to hunters for a short duration.
  - Ghost remains visible only for the flash duration unless other visibility triggers (dash, grab, spell) are active.

You can simulate the effect visually by:

- Temporarily overriding the dark overlay to show full tiles near windows.
- Overlaying a bright white flash + thunder sound.

---

## Luigi’s Ghost Mansion – Top‑Down 2D Implementation Notes

Given your constraint—everyone top‑down 2D—here is how to map original behavior:

- **Ghost view**:
  - Always‑lit full map (no fog of war).
  - All hunters drawn as colored icons.
  - Ghost icon centered or free‑scroll within map bounds.

- **Hunter views**:
  - Same tile grid, but covered by a dark overlay except for:
    - Tiles within each hunter’s flashlight cone.
    - Very small ambient radius around each hunter.
  - Ghost sprite only drawn for hunters when:
    - dashActive == true, and ghost within their viewport;
    - ghost is overlapping a hunter and causing faint;
    - lightningFlashActive == true and ghost within lit tiles.

This sticks very closely to the original information asymmetry while fitting your “everyone has a top‑down view” requirement.

---

## Luigi’s Ghost Mansion – Health, Damage, and Win Logic

**Ghost health**

- Health starts at 100.
- Each frame the ghost is in any flashlight cone:
  - Reduce health by an amount scaled by number of overlapping flashlights and whether a gold battery is active.
- If health reaches 0:
  - Ghost is defeated; hunters win.
  - Trigger victory animation and stats screen.

**Hunter lives and team defeat**

- Each hunter has a life counter as described earlier.
- When a hunter faints, decrement their remaining lives; they revive with reduced lives when successfully revived.
- If all hunters are simultaneously fainted (even if some have lives left but are currently downed):
  - Ghost wins immediately.

**Timer and tie**

- If timer reaches zero with ghost health > 0 and at least one hunter still active:
  - Round ends in a tie.

---

## Luigi’s Ghost Mansion – Feedback and UI

To match the feel:

- **HUD for hunters**
  - Timer.
  - Individual flashlight battery meter.
  - Life icons.
  - A "light low" warning when battery is nearly empty.
- **HUD for ghost**
  - Timer.
  - Ghost health meter.
  - Spell charge meter / cooldown indicator.
- **Rumble / proximity feedback**
  - For your browser version, substitute controller rumble with:
    - Screen vignette that pulses.
    - Icon or text showing “Ghost nearby!” with intensity based on distance.

**Round end**:

- Clear win banners: “Ghost Wins!”, “Ghost Trackers Win!”, “Draw”.
- Show simple stats:
  - Time remaining or elapsed.
  - Ghost grabs.
  - Damage dealt per hunter (optional).

---

## Summary of “Exactly What Needs to Be Implemented”

Here is an at‑a‑glance checklist you can turn into issues/tasks:

### Luigi’s Ghost Mansion – Must‑Have

- Role system: 1 ghost vs 1–4 hunters, plus Monita CPUs for missing hunters.
- Views:
  - Ghost: full top‑down always‑lit map with all hunters.
  - Hunters: top‑down dark map with limited flashlight cone and ambient radius.
- Visibility rules for ghost:
  - Not shown to hunters by default.
  - Shown only on dash, grab, lightning, or spell charge.
- Ghost mechanics: movement, dash with visibility, chargeable magic spell that drains battery and stuns Monita, touch‑based faint attack.
- Hunter mechanics: movement, flashlight cone, sidestep, battery drain & recharge, gold battery temporary upgrade, life counters, revive system.
- Lightning system: timed random global flashes that reveal parts of the map and ghost if present.
- Stage system: five mansion layouts with corridors, rooms, windows, and battery spawn points.
- Feedback: rumble‑like proximity indication, health/battery/life HUD, win/lose/tie screens, basic stats.
