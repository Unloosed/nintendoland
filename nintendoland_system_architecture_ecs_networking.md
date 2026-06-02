# Nintendo Land Reimagined: System Architecture, Networking, and ECS Design

## Document status
- Version: 1.0
- Type: Technical architecture document
- Scope: Shared runtime architecture for six asymmetric attractions
- Assumption: authoritative online multiplayer with local hybrid support

## Overview
Nintendo Land's original attractions were built around hardware-driven asymmetric play, where GamePad and Wii Remote players often had different information and control schemes.[page:2] A modern re-creation needs a shared architecture that can support role-specific cameras, private information channels, multiple minigame rule sets, and low-latency multiplayer under one runtime.[page:2] This document defines a modular technical architecture with an ECS-driven gameplay layer and an authoritative network model tuned for short-session party games.

## Architectural goals
- One executable supports all attractions.
- Shared systems handle input, cameras, HUD, networking, matchmaking, replay, and persistence.
- Attractions are data-driven game modes on top of common gameplay primitives.
- Role asymmetry is treated as a first-class network and ECS concern, not a per-mode hack.
- Local and online players can coexist in the same session.

## High-level stack
```text
+--------------------------------------------------------------+
| Client Application                                            |
|  - Rendering                                                  |
|  - Audio                                                      |
|  - Input                                                      |
|  - Prediction/Interpolation                                   |
|  - UI/HUD                                                     |
+----------------------------+---------------------------------+
                             |
                             v
+--------------------------------------------------------------+
| Session Layer                                                  |
|  - Lobby                                                      |
|  - Match setup                                                |
|  - Role assignment                                            |
|  - Map selection                                              |
|  - Party transport                                            |
+----------------------------+---------------------------------+
                             |
                             v
+--------------------------------------------------------------+
| Gameplay Runtime                                               |
|  - ECS World                                                  |
|  - Mode rules                                                 |
|  - Ability systems                                            |
|  - AI systems                                                 |
|  - Visibility systems                                         |
|  - Scoring and state flow                                     |
+----------------------------+---------------------------------+
                             |
                             v
+--------------------------------------------------------------+
| Network Layer                                                  |
|  - Transport                                                  |
|  - Replication                                                |
|  - Snapshot delta                                             |
|  - RPC/events                                                 |
|  - Reconciliation                                             |
+----------------------------+---------------------------------+
                             |
                             v
+--------------------------------------------------------------+
| Platform Services                                              |
|  - Accounts                                                   |
|  - Matchmaking                                                |
|  - Persistence                                                |
|  - Telemetry                                                  |
|  - Moderation                                                 |
+--------------------------------------------------------------+
```

## Runtime model
### Core principle
The game runs one shared simulation model for all attractions. Each attraction loads a rules package that enables the components, systems, content definitions, and win conditions relevant to that mode.

### Runtime phases
1. Boot
2. Frontend shell
3. Party lobby world
4. Match staging world
5. Gameplay world
6. Results world
7. Return to lobby or next match

### World partitioning
Use separate ECS worlds or subworld partitions for:
- Frontend UI world
- Lobby world
- Active gameplay world
- Replay or spectator world

This prevents menu entities and gameplay entities from sharing state accidentally and makes hot reload and debugging easier.

## Networking model
### Authority choice
Use a server-authoritative model for online sessions. This is the safest approach for asymmetric games because hidden information, stealth states, score validity, and tag or hit results must not be trusted to clients.

### Session variants
- Dedicated server for public matchmaking
- Listen server for private custom games
- Local-only simulation for couch play
- Hybrid session where one machine hosts local players and also connects online

### Transport
- UDP-based transport for gameplay packets
- Reliable ordered channel for match state, inventory, lobby, and unlock events
- Unreliable sequenced channel for movement inputs, transient aim state, and high-frequency transform replication

### Replication model
The server simulates the authoritative ECS world and sends filtered snapshots to each client. Snapshot filtering is critical because Nintendo Land-style asymmetry requires certain players to know things others must not know, such as Mario's full-map knowledge or the ghost's hidden position relative to trackers.[page:2]

### Interest management
Interest management operates on three layers:
- Spatial relevance, entities near the player
- Role relevance, entities or fields visible to that role
- Spectator or observer relevance, full or restricted broadcast

Example:
- Mario receives all Toad positions in Mario Chase.[page:2]
- Toads receive Mario distance and local last-known traces, but never Mario's precise position unless revealed.
- Ghost trackers never receive the ghost transform while the ghost is invisible, only permitted proxy cues.[page:2]

### Tick rates
Recommended defaults:
- Simulation tick: 30 Hz
- Input send rate: 30 Hz
- Snapshot send rate: 15 to 20 Hz
- Client render interpolation: 100 to 150 ms buffer

These values fit party-scale movement and ability games while keeping bandwidth manageable for 5-player sessions.

### Prediction and reconciliation
Use client-side prediction only for locally controlled movement and low-stakes action feel. Reconcile against authoritative state for:
- Position
- Velocity
- Stamina or sprint resources
- Ability cooldown start times
- Damage and tag events

Avoid predicting hidden-information outcomes such as stealth reveals or capture confirmation unless the local result can be rolled back cleanly.

### Lag compensation
Needed for:
- Flashlight-on-ghost checks
- Projectile hit validation
- Tag captures in Mario Chase
- Gunship missile or beam collision in Metroid Blast

Server stores a short history buffer of transforms and relevant collision states, then rewinds target state to the command timestamp for validation.

### Network event types
Use four primary message classes:
- Input commands
- State snapshots
- Reliable game events
- Session control events

#### Input commands
```text
struct InputCommand {
  uint32 client_tick;
  EntityId controlled_entity;
  MoveVector move;
  AimVector aim;
  uint32 button_mask;
  uint16 analog_primary;
  uint16 analog_secondary;
}
```

#### Reliable game events
Examples:
- MatchStart
- RoleAssigned
- GhostRevealed
- PlayerDowned
- ObjectiveCompleted
- SuddenDeathStarted
- MatchEnded

### Disconnect handling
- Grace period for reconnect in co-op modes
- Bot takeover optional in private sessions
- Immediate forfeit or substitution policy configurable by playlist
- Server preserves player slot and role mapping for a short timeout window

## Security model
### Trust boundaries
Clients may request actions but never decide outcomes. The server validates:
- Movement envelopes
- Cooldown readiness
- Ability ownership
- Objective interaction ranges
- Visibility eligibility
- Match rewards

### Cheat mitigation
- Signed build and anti-tamper optional per platform
- Server-side hidden-information control
- Input anomaly detection
- Replay-backed moderation review
- Rate limits for RPCs and chat events

## ECS design
### Why ECS
The project contains six attractions with overlapping gameplay needs but different rule combinations. ECS is appropriate because it enables composition of movement, combat, stealth, collection, command, and scoring behaviors without hardcoding inheritance trees for every role variant.

### ECS layers
- Core components: identity, transform, ownership, team, role
- Simulation components: movement, health, stamina, visibility, collision
- Gameplay components: abilities, objectives, inventory, carry weight, revive state
- Presentation components: animation state, VFX tags, audio emitters, camera target
- Networking components: replication policy, authority, dirty mask, prediction state
- Mode components: attraction-specific markers and rule data

## Entity categories
### Player-linked entities
- PlayerConnection
- PlayerAvatar
- Pawn or CharacterBody
- CameraRig
- HUDProxy
- InputBuffer

### World entities
- ObjectiveNode
- Pickup
- SpawnPoint
- Hazard
- TriggerVolume
- Door or Gate
- NavMarker
- CoverPoint

### AI entities
- EnemyMob
- BossActor
- PatrolGhostDecoy
- YoshiScout or AI helper equivalent

### Meta entities
- MatchState
- RoundTimer
- ScoreBoard
- VisibilityDirector
- SpawnDirector
- AudioStateDirector

## Component model
### Core identity and control
```text
Component: Transform
- position
- rotation
- scale

Component: Velocity
- linear
- angular

Component: NetworkOwner
- player_id
- authority_mode

Component: RoleTag
- role_type
- attraction_type

Component: TeamAffiliation
- team_id
- relationship_mask
```

### Character simulation
```text
Component: CharacterMotor
- move_speed
- acceleration
- air_control
- friction
- jump_profile

Component: CollisionBody
- shape
- layer
- mask

Component: Health
- current
- max
- invuln_until_tick

Component: Energy
- current
- max
- regen_rate
```

### Ability framework
```text
Component: AbilityLoadout
- ability_ids[]

Component: AbilityState
- cooldowns[]
- charges[]
- active_flags

Component: AimState
- origin
- direction
- spread
- zoom_level
```

### Objective and interaction
```text
Component: Interactable
- interaction_type
- radius
- allowed_roles

Component: ObjectiveState
- objective_id
- stage
- progress
- completion_flags

Component: Carryable
- weight
- owner_entity
- team_locked
```

### Visibility and asymmetry
```text
Component: VisibilityState
- visible_to_teams_mask
- hidden_mode
- reveal_until_tick

Component: SensorProfile
- sight_radius
- hearing_radius
- reveal_rules

Component: KnowledgeChannel
- minimap_access
- enemy_marker_policy
- private_objective_set
```

### Networking
```text
Component: ReplicationPolicy
- frequency_bucket
- reliability_mode
- cull_distance
- role_filter

Component: Predicted
- last_input_tick
- reconciliation_state

Component: GhostedSnapshot
- baseline_id
- changed_fields_mask
```

## System groups
### Fixed-step simulation systems
Run every simulation tick in deterministic order:
1. Input ingest
2. Command validation
3. Movement and physics
4. Collision resolution
5. Ability execution
6. Combat and damage
7. Visibility resolution
8. Objective progression
9. AI update
10. Round rules
11. Replication gather

### Variable-step presentation systems
Run client-side per frame:
- Camera follow
- Animation graph sync
- Footstep and VFX triggers
- HUD updates
- Audio spatialization
- Interpolation and smoothing

## Shared gameplay systems
### Input system
Normalizes keyboard, mouse, controller, gyro, and optional companion input into a single action-command format.

### Movement system
Handles walk, sprint, dodge, hover, and traction profiles. Character movement should be data-driven so Toads, swordsmen, animals, ghost, and Pikmin avatars can share one motor family with different tuning.

### Ability system
A generic ability pipeline supports:
- Instant abilities
- Charged abilities
- Channel abilities
- Aim-confirm abilities
- Area-target abilities
- Multi-entity command abilities

### Damage and status system
Unified support for:
- Direct damage
- Cone or beam damage
- Stun
- Reveal
- Slow
- Knockback
- Downed state

### Objective system
Represents mode-specific win conditions as data graphs:
- Defeat boss
- Survive timer
- Collect target value
- Capture token threshold
- Eliminate all opponents
- Deposit stash count

### Visibility system
This is one of the most important systems in the whole project. It computes what each role is allowed to know, then feeds both gameplay and networking layers.

Visibility outcomes include:
- Fully visible
- Occluded but known
- Hidden but hinted
- Fully hidden
- Temporarily revealed

### Camera system
Camera rigs are attached by role profile rather than pawn class. Supported rig types:
- Third-person chase
- Tactical top-down
- Free-flight chase
- First-person zoom
- Spectator orbit

### Scoring and results system
Handles round score, performance medals, assist credit, cosmetic XP, and role rotation recommendations.

## Attraction-specific data packs
Each attraction ships as a rules package containing:
- Role definitions
- Allowed components
- Ability catalogs
- Map metadata
- Objective graph
- Spawn tables
- Score formula
- Tutorial script
- HUD layout references

## Mode-specific ECS examples
## Mario Chase
### Key entities
- MarioRunner
- ToadChaser
- ArenaShortcut
- DistanceBeaconProxy
- LastSeenMarker
- AIScoutHelper

### Key components
- FullMapAccess on Mario
- DistanceOnlyTracker on Toads
- TagCollider on all chase pawns
- RouteAdvantage or BurstCharge on Mario

### Key systems
- TagResolutionSystem
- DistanceHintSystem
- RunnerVisionSystem
- CatchupAssistSystem

## Luigi's Ghost Mansion
### Key entities
- GhostPawn
- TrackerPawn
- BatteryPickup
- RevealPulseZone
- MansionDoor

### Key components
- InvisibilityState on ghost
- FlashlightCone on trackers
- BatteryReserve on trackers
- ProximityFearSignal on trackers

### Key systems
- GhostRevealSystem
- FlashlightDamageSystem
- BatteryDrainSystem
- ReviveSystem
- FearCueSystem

## Animal Crossing: Sweet Day
### Key entities
- GuardUnitA
- GuardUnitB
- AnimalRunner
- CandyPickup
- CandyStash
- CatchZone

### Key components
- DualControlLink on guard units
- CandyWeight on runners
- CatchCountState on match entity
- DepositObjective on stash nodes

### Key systems
- DualUnitCommandSystem
- CarrySlowSystem
- CaptureResolutionSystem
- CandyRespawnSystem

## Pikmin Adventure
### Key entities
- CaptainPawn
- PikminHeroPawn
- SwarmUnit
- CarryTarget
- BridgeBuildSite
- BossWeakPoint

### Key components
- CommandRadius on captain
- SwarmMembership on Pikmin
- CarryWeight on objects
- WeakPointState on bosses

### Key systems
- SwarmCommandSystem
- ObjectCarrySystem
- BuildProgressSystem
- BossPhaseSystem

## Metroid Blast
### Key entities
- GunshipPawn
- TrooperPawn
- MissileProjectile
- MissionNode
- TokenPickup

### Key components
- FlightMotor on gunship
- LockOnTargetable on troopers and ship
- AerialThreatMarker on gunship
- TokenInventory in Ground Battle

### Key systems
- FlightControlSystem
- LockOnSystem
- MissileResolutionSystem
- MissionDirectorSystem
- TokenScoreSystem

## Battle Quest
### Key entities
- ArcherPawn
- SwordsmanPawn
- ShieldEnemy
- ElevatedCaster
- BossCoreWeakPoint

### Key components
- ArrowChargeState on archer
- GuardState on swordsmen
- WeakPointOnlyDamage on boss parts
- ScoutReveal on marked enemies

### Key systems
- MeleeComboSystem
- ChargedShotSystem
- ScoutTagSystem
- BossVulnerabilitySystem

## Data-driven role model
Each role should be defined through data rather than class inheritance.

```yaml
role_id: mario_runner
attraction: mario_chase
pawn_archetype: agile_runner
camera_profile: tactical_topdown_runner
hud_profile: mario_chase_runner_hud
abilities:
  - burst_dash
  - route_ping
knowledge:
  minimap_access: full
  enemy_marker_policy: exact_positions
movement:
  max_speed: 7.0
  acceleration: 16.0
network:
  prediction: full_local
  replicate_to_roles:
    - self
    - spectators
    - server
```

## Data-driven objective graph
Represent objectives as nodes and transitions.

```yaml
objective_graph:
  - id: phase_1
    type: survive_waves
    complete_when:
      enemy_count: 0
    next: phase_2
  - id: phase_2
    type: destroy_targets
    target_group: shield_nodes
    next: boss_phase
  - id: boss_phase
    type: defeat_boss
    next: match_complete
```

## Match flow architecture
### Lobby service responsibilities
- Party membership
- Chat and ready state
- Attraction vote or selection
- Role preference collection
- Server reservation

### Match server responsibilities
- World initialization
- Spawn and role assignment
- Rules package load
- Tick simulation
- Snapshot filtering
- Persistence writeback at end of match

### End-of-match responsibilities
- Validate rewards
- Publish telemetry
- Save replay index
- Offer rematch with optional role rotation

## Replay and spectator design
### Replay model
Store input streams plus periodic world snapshots for rewindable server-authored replay. Replays help with bug reports, moderation, highlight capture, and balancing.

### Spectator model
Spectators subscribe to a specialized visibility policy:
- Tournament mode: full visibility
- Stream-safe mode: delayed or filtered visibility
- Friend-watch mode: followed-player perspective only

## Persistence model
Persist only account and metagame data, not live match authority.

### Saved data
- Cosmetics and unlocked profiles
- Tutorial completion per attraction and role
- Lifetime stats and role usage
- Input and accessibility settings
- Replays metadata and bookmarks

## Tooling
### Content tools
- Role editor
- Objective graph editor
- Spawn and wave editor
- Visibility debugger
- Map annotation tool
- Replay viewer

### Debug overlays
- Interest management overlay
- Hidden-information overlay per role
- Replication bandwidth heatmap
- Prediction error graph
- Tick timing breakdown

## Engine recommendations
### Good fit
- Bevy or custom Rust ECS for strong data-oriented control
- Unreal with Mass or gameplay framework hybrid for fast 3D tooling
- Unity DOTS hybrid only if team has existing expertise and accepts workflow complexity

### Practical recommendation
For a small technical team, a hybrid architecture is usually safest: use an engine for rendering, animation, UI, and platform support, while keeping game rules, replication policies, and role logic in a data-oriented gameplay layer.

## Performance targets
- 60 FPS render on target hardware
- 30 Hz authoritative simulation minimum
- Sub-120 ms practical end-to-end feel for chase modes in regional play
- Under 64 Kbps average upstream per client during gameplay target envelope
- Under 5 seconds from match accept to active round start on warm server

## Failure cases and safeguards
### Hidden information leaks
Mitigation: filter replicated fields per role before serialization, never send then hide.

### Desync under prediction
Mitigation: keep prediction surface small, favor server authority for tags and reveals.

### Mode code duplication
Mitigation: every attraction must justify new systems; prefer composing shared components and systems.

### Tooling debt
Mitigation: build visibility and replication debugging tools early, because asymmetric multiplayer is difficult to validate by feel alone.

## Acceptance criteria
- All six attractions run on one shared authoritative server runtime.
- Role-based visibility filtering works for every asymmetric mechanic.
- New attraction rules can be added primarily through data packs and limited new code.
- Private and public sessions support reconnect and replay capture.
- ECS systems remain modular enough that at least 70 percent of runtime systems are shared across three or more attractions.
