# FIVE NIGHTS AT I-3 (5NAI-3)
## Master Game Design Document (GDD) & Narrative Script
**Version:** 1.0.0  
**Genre:** Survival Horror / Competitive Algorithmic Strategy  
**Inspiration:** *Five Nights at Freddy's* × Real-time Systems Programming & Competitive Coding  
**Platform:** PC (Web / Desktop App)  

---

## 1. EXECUTIVE SUMMARY & CORE HOOK

### 1.1 The Concept
*Five Nights at I-3* places the player inside the isolated security cockpit of **Lab I-3**, an abandoned advanced computational and robotic research facility. Between **11:00 PM and 6:00 AM**, five decommissioned experimental autonomous entities awaken from their private cabins. All five hunt the player every night; each night they grow faster and more aggressive.

The twist: **Your survival relies on your code.** 
Power is finite and constantly drains as you operate surveillance monitors, halogen spotlights, and pneumatic blast gates. To recharge the facility's backup generator:
* **Every correct code solution or bug fix grants: `+5% Battery`**
* **Every compiler error, runtime exception, or failed assertion punishes you with: `-7% Battery`** (circuit surge)
* If power drops to **0%**, all security gates disengage, the lab blackouts, and the entities breach the office.

---

## 2. NARRATIVE BIBLE & LORE

### 2.1 The Lore of Lab I-3
Lab I-3 was the crown jewel of the institute’s Department of Autonomous Systems. Five years ago, the "Project Singularity" research team attempted to build autonomous hardware daemons capable of real-time machine-code rewriting.

On November 17th, during a high-voltage test at 11:42 PM, a critical memory overflow occurred—dubbed the **Fatal Segmentation Fault**. The five prototype units suffered massive firmware corruption, developing hostile predatory behaviors mapped to low-level system faults. The lab was evacuated, boarded up, and sealed.

However, the institute's automated systems still run essential campus simulations through the main cluster inside Lab I-3. Because human technicians refuse to enter during the night, the institute hires temporary night contractors—**Night Systems Sentinels**—to sit in the isolated security room, patch runtime errors on the cluster, and keep the containment gates intact until dawn.

---

## 3. FACILITY MAP & ENVIRONMENT LAYOUT

```
                           +---------------+
                           |    CABIN 1    |
                           |  (Rust-Byte)  |
                           +-------+-------+
                                   |
    +---------------+      +-------v-------+      +---------------+
    |    CABIN 3    |      |               |      |    CABIN 2    |
    | (Echo/Glitch) |----->|               |<-----| (NullPointer) |
    +---------------+      |   BIG HALL    |      +---------------+
                           |  (CAM 01/02)  |
    +---------------+      |               |      +---------------+
    |  THE CABINET  |----->|               |<-----|    CABIN 4    |
    | (Fuse / CAM)  |      +-------+-------+      |   (Deadlock)  |
    +---------------+              |              +---------------+
                                   |
                           +-------v-------+
                           |    CABIN 5    |
                           | (Kernel Zero) |
                           +-------+-------+
                                   |
                  +----------------+----------------+
                  |                                 |
           +------v------+                   +------v------+
           |  LEFT GATE  |                   |  RIGHT GATE |
           |  & LIGHT    |                   |   & LIGHT   |
           +------+------+                   +------+------+
                  |                                 |
                  +----------------+----------------+
                                   |
                      +------------v------------+
                      |      SECURITY ROOM      |
                      |  [Surveillance Monitor] |
                      |   [Code IDE Terminal]   |
                      +-------------------------+
```

### 3.1 Room Directory
1. **Security Room (Office)**:
   * Two doorway blind spots: **Left Gate** & **Right Gate**.
   * Door Controls: Push buttons for **Door [Close/Open]** and **Light [Toggle/Hold]**.
   * Desktop Setup: Dual displays—Monitor 1 shows the **CCTV Grid (Cameras 01–07)**; Monitor 2 shows the **Live Code Terminal (IDE)**.
2. **The Big Hall (Main Corridor - CAM 01 & 02)**:
   * A cavernous, tiled corridor with flickering fluorescent tubes and exposed conduits. Footsteps and mechanical whirs echo loudly here.
3. **The Cabinet (CAM 03)**:
   * A heavy metal electrical breaker locker in the hallway. Units tamper with this to induce power drops and terminal static.
4. **Cabins 1 to 5 (CAM 04 – 08)**:
   * Five individual glass-paneled containment rooms where each entity is docked when the night begins at 11:00 PM.

### 3.2 Real Location Photos (`images/lab/`)
The facility is based on the real I-3 lab. Reference photos are stored in `images/lab/` (originals in `images/lab_raw/`):

| Game Location | Camera | Photo Files | Real Space |
| :--- | :---: | :--- | :--- |
| Big Hall | CAM 01/02 | `big_hall_1` – `big_hall_4` | Open hall with rows of blue & yellow desks |
| The Cabinet | CAM 03 | `cabinet_1`, `cabinet_2`, `cabinet_door` | Battery / inverter room behind a "No Entry" door |
| Security Room (Office) | — | `office_1` (main view), `office_2`, `office_3` | Glass-walled office with orange desk & armchair |
| Hallway to Office Doors | — | `hallway` | Long narrow corridor |
| Cabin 1 (Rust-Byte) | CAM 04 | `cabin1_1` – `cabin1_3` | Small cabin with desk & grey cabinet |
| Cabin 2 (NullPointer) | CAM 05 | `cabin2_1`, `cabin2_2` | Glass-walled cabin with PC |
| Cabin 3 (Echo) | CAM 06 | `cabin3_1`, `cabin3_2` | Workroom with dark desks & monitors |
| Cabin 4 (Deadlock) | CAM 07 | `cabin4_1` – `cabin4_3` | Storeroom piled with chairs & a bunk bed |
| Cabin 5 (Kernel Zero) | CAM 08 | `cabin5_1`, `cabin5_2` | Empty room / sofa room |
| Kernel Zero art reference | — | `kernel_zero_reference` | Humanoid robot sealed in a glass display cabinet |

**Before public release:** blur or crop the IEEE pillar (`big_hall_3`), the poster and the photographer's reflection (`kernel_zero_reference`). Photos with visible people (`lab_raw/photo01`, `photo03`, `photo04`) are deliberately excluded. Still missing: a view of each office doorway taken from the desk.

---

## 4. THE 5 VILLAIN DOSSIERS & AI MECHANICS

```
================================================================================
CABIN 1: "THE DEPRECATED" (Unit 01: Rust-Byte)
================================================================================
Archetype:       The Shuffler (FNAF Bonnie equivalent)
Visual:          Heavy, rusted copper-plated bipedal chassis with exposed servos,
                 a tilted optical head, and dragging hydraulic limbs.
Movement Route:  Cabin 1 -> Big Hall (North) -> Left Hallway -> Left Office Door
Behavior:        Moves methodically. Auditory tell is the heavy dragging of metal 
                 and hydraulic wheezing.
Light Effect:    Halogen light overloads its ocular sensors, freezing it in place.
Gate Defense:    If seen outside the Left Door via the light, slam the LEFT GATE.
                 It bangs on the door 3 times, then retreats to the Big Hall.
```

```
================================================================================
CABIN 2: "NULLPOINTER" (Unit 02: Vector)
================================================================================
Archetype:       The Sprinter (FNAF Foxy equivalent)
Visual:          Lightweight, stripped chrome carbon-fiber skeleton with high-speed
                 pneumatic legs and glowing cyan sensory slits.
Movement Route:  Cabin 2 -> Big Hall -> Full Sprint down the Left Corridor
Behavior:        Has 3 visual stages inside Cabin 2:
                   Stage 1: Lurking behind the cabin curtain.
                   Stage 2: Peeking out, head twitching erratically.
                   Stage 3: Cabin is empty (SPRINT TRIGGERED).
Light Effect:    Ineffective during full sprint—light only delays its launch while inside Cabin 2.
Gate Defense:    When Cabin 2 is empty, the player has 2.5 seconds to slam the 
                 LEFT GATE. NullPointer crashes into the door with tremendous force,
                 draining a small flat 1% battery on impact, then walks back.
```

```
================================================================================
CABIN 3: "GLITCH_DAEMON" (Unit 03: Echo)
================================================================================
Archetype:       The Saboteur / Disruptor (FNAF Chica / Balloon Boy hybrid)
Visual:          Distorted speaker-cone head, exposed ribbon cables, erratic 
                 stroboscopic LED chassis.
Movement Route:  Cabin 3 -> Big Hall -> The Cabinet
Behavior:        Does not attack the security room directly. Instead, it breaks into 
                 THE CABINET to hijack the electrical transformers.
Consequence:     When inside The Cabinet, it emits high-frequency broadband interference:
                   - Shuts down 2 random camera feeds with static.
                   - Scrambles letters on your code terminal into corrupt ASCII glyphs.
                   - Increases base battery drain by 2x.
Defense:         Switch to CAM 03 (The Cabinet) and flick the Cabinet Strobe Light to 
                 scare it back to Cabin 3, or solve a 1-line "Syntax Purge" command on the terminal.
```

```
================================================================================
CABIN 4: "THE THREAD-LOCKER" (Unit 04: Deadlock)
================================================================================
Archetype:       The Shadow Stalker (FNAF Freddy equivalent)
Visual:          Massive, matte-black industrial unit. Operates with near-silent
                 magnetic levitation joints; only two cold white eye-LEDs are visible in darkness.
Movement Route:  Cabin 4 -> Big Hall (Shadows) -> Right Hallway -> Right Office Door
Behavior:        Stealth hunter. It only moves when the player is NOT looking at it 
                 on cameras or while the player is typing in the IDE.
Auditory Tell:   Deep low-frequency bass hums and subtle servo clicks.
Light Effect:    Direct spotlight exposure forces it to halt and slowly back away.
Gate Defense:    Reaches the RIGHT GATE silently. If the light reveals its glowing eyes 
                 at the doorway, slam the RIGHT GATE immediately.
```

```
================================================================================
CABIN 5: "THE ROOT DAEMON" (Unit 05: Kernel Zero)
================================================================================
Archetype:       The Puppet / Golden Freddy (Algorithmic Watchdog Boss)
Visual:          Sealed inside a glass isolation chamber in Cabin 5, tethered to thick 
                 fiber-optic umbilical cables. A holographic red skull terminal mask.
Movement Route:  Does not walk down the hallway. It executes a remote memory takeover.
Behavior:        A dedicated "WATCHDOG OVERFLOW" bar (0% to 100%) ticks upward on 
                 the player's terminal every second.
Consequence:     If the bar reaches 100%, Kernel Zero breaks containment, teleports directly 
                 into the Security Room, bypassing both physical blast doors.
Defense:         The player must periodically execute a Heartbeat Handshake script or 
                 pass a specialized sanity test case on the terminal to flush the buffer back to 0%.
```

---

## 5. THE SURVIVAL MECHANICS & CODE-POWER ENGINE

### 5.1 Shift Parameters
* **Shift Duration:** 11:00 PM to 6:00 AM (7 In-Game Hours).
* **Clock Ratio:** 1 In-Game Hour = 70 real-world seconds (Total Night Duration = 8 minutes, 10 seconds).

### 5.2 Power Grid Dynamics (100% Maximum)
```
+------------------------------------+--------------------------+
| ACTION / STATE                     | POWER IMPACT             |
+------------------------------------+--------------------------+
| Passive Idle                       | -0.10% / sec             |
| CCTV Monitor Open                  | -0.40% / sec             |
| Halogen Spotlight Active (L or R)  | -1.00% / sec             |
| One Blast Gate Closed              | -1.80% / sec             |
| Both Blast Gates Closed            | -3.80% / sec             |
| Echo in The Cabinet (Unchecked)    | +100% passive drain rate |
|------------------------------------+--------------------------|
| CORRECT CODE SUBMISSION ACCEPTED   | +5.00% Instant Recharge  |
| COMPILATION ERROR / TEST FAILURE   | -7.00% Electrical Surge  |
+------------------------------------+--------------------------+
```

### 5.3 Blackout Protocol (0% Battery)
When the battery hits 0%:
1. Loud breaker explosion sound effect; all ambient lights, monitors, and the terminal shut off instantly.
2. Left and Right Blast Gates immediately pop open (hydraulic pressure release SFX).
3. Complete silence for 3–6 seconds.
4. Glowing eyes appear in the Left Doorway, playing an 8-bit distorted music box rendition.
5. Inevitable jumpscare and "KERNEL PANIC: FATAL UNHANDLED EXCEPTION" game over screen.

---

## 6. THE CODING ENGINE & TASK TAXONOMY

The coding panel runs lightweight, high-focus micro-challenges in **Python / JavaScript / C++** (player can select their preferred language in settings).

### Challenge Types:
1. **Type 1: Bug Hunter (Fast Syntax / Off-by-One)**
   * *Example:* Find and fix the boundary condition in a loop `for i in range(len(arr) + 1):` -> `len(arr)`.
   * *Time required:* 10–15 seconds.
2. **Type 2: Algorithmic Micro-Fix (Logic Assertions)**
   * *Example:* Complete a binary search midpoint formula to prevent integer overflow: `mid = left + (right - left) // 2`.
   * *Time required:* 20–30 seconds.
3. **Type 3: Output Predictor (Mental Execution)**
   * *Example:* Multi-choice question: "What does this stack evaluate to after 4 operations?"
   * *Time required:* 10 seconds.
4. **Type 4: Watchdog Heartbeat (Cabin 5 Neutralizer)**
   * *Example:* Type a specific formatted system token or complete a regex matching string to trigger `sys.flush_buffer()`.

---

## 7. FULL AUDIO LOG SCRIPT (PHONE GUY / PREVIOUS SYSADMIN)

On the desk sits a vintage cassette player labeled **"SENTINEL ORIENTATION LOGS"**. At 11:00 PM each night, a tape automatically clicks and plays.

### Night 1: 11:00 PM — "Welcome to I-3"
*(Sound of tape hiss, a lighter flicking, followed by tired clearing of throat)*

> **Admin Kaelen:** 
> "Uh, hello? Hello, hello! Hey there, newcomer. Welcome to your first shift as the Night Sentinel for Lab I-3. 
> 
> First off, congratulations! The pay is great, the campus is quiet, and nobody is around to micromanage you. Now, I know you've probably heard rumors around the engineering quad about the 'Fatal Segfault' back in twenty-one. Forget about it. Campus rumors are ninety-nine percent garbage.
> 
> Mostly.
> 
> Look, here’s the real deal: the lab has five private cabins. Each houses an old autonomous hardware unit. When the university mainframes power down at eleven, the auxiliary line routes through your room. The problem is... these units are still running in low-power idle loops, and their firmware is, uh, confused. They perceive human biometric signatures as unhandled exceptions that need to be wiped from memory.
> 
> So, two ground rules:
> Rule one: your security gates and halogen lights. If Unit Zero-One—we call him 'Rust-Byte' in Cabin One—if he walks down the hall and stands at your left door, do not panic. Turn on the door light. It blinds his optic array. If he doesn’t back off, slam the gate. When you hear the clunk, open it back up.
> 
> Rule two: your terminal. Notice your battery gauge. Running those doors eats power like a crypto rig. The only way to feed the generator is to keep the cluster compiled. Your terminal will spit out code tasks. Get one right? You feed five percent back into the grid. Mess up? The surge will short out seven percent instantly. So please, double-check your syntax before you hit compile.
> 
> Now, I'm not gonna lie to you: all five of them are awake tonight. Rust-Byte, NullPointer in Cabin Two, Echo in Three, Deadlock in Four, and... the thing in Cabin Five. Good news is, first night they're sluggish. Barely booted. Keep an eye on every camera, keep that watchdog gauge on your terminal from filling up, and I'll walk you through each of them over the next few nights.
> 
> Just keep the lights on, solve your tickets, and see you at six AM. Good luck."

---

### Night 2: 11:00 PM — "The Sprinter"
*(Sound of hurried footsteps on tape, anxious breathing)*

> **Admin Kaelen:**
> "Hey! You survived Night One! Told you it wasn’t that bad!
> 
> Okay, listen up, because tonight things get slightly... spicier. You remember how I mentioned Cabin Two? Yeah, Unit Zero-Two. NullPointer. 
> 
> That thing has active pneumatic sprint servos. In plain English: he runs. Fast. You need to keep Camera Zero-Five on your monitor and check Cabin Two regularly. If you see the curtains open and his eyes glowing... check again soon. If you flip to that camera and the cabin is empty...
> 
> Drop your monitor, do NOT finish whatever function you're writing, and slam that LEFT GATE down immediately. You have maybe two seconds before he hits the steel door. If you block him, he’ll head back. But do not try to shine the light on him while he’s sprinting. It won't stop him. 
> 
> Keep your eyes sharp, keep compiling, and remember: speed kills, but a syntax error will kill you faster."

---

### Night 3: 11:00 PM — "Static in The Cabinet"
*(Audio starts with crackles of electronic static and distorted humming)*

> **Admin Kaelen:**
> "Hello? Can you hear me over that whine? Ugh.
> 
> If you're hearing high-pitch radio static, that means Unit Zero-Three—'Echo'—is out of Cabin Three. She loves electrical hardware. Specifically, that tall gray supply cabinet out in the Big Hall.
> 
> If she climbs inside The Cabinet, she’s going to chew through our auxiliary relays. You'll notice your code terminal start spewing corrupted Unicode and your camera screens turning into white noise. When that happens, your battery drain doubles. 
> 
> Switch your camera to The Cabinet, strobe the interior light to scare her out, or purge the socket from your command line. And whatever you do, don't let Deadlock—Unit Four—catch you distracted. He stays in the dark on the right corridor. He only moves when you're busy staring at the IDE. 
> 
> Check your right blind spot, Sentinel!"

---

### Night 4: 11:00 PM — "The Watchdog"
*(Admin Kaelen's tone is noticeably grim, distant metallic groans in background)*

> **Admin Kaelen:**
> "Hey. If you made it to Thursday, you’re either an Olympic-level coder or the luckiest person on this campus. 
> 
> Tonight, the university scheduled a heavy distributed load on the core servers. That means Cabin Five gets hungry. Hungrier than you've seen it.
> 
> 'Kernel Zero'. 
> 
> That unit isn't like the physical stalkers in Cabins One through Four. You can't stop it with a blast door. It doesn't care about halogen lights. That red gauge on your IDE labeled 'Watchdog Buffer'? You've been feeding it all week. Tonight it fills a lot faster, every second you don't ping it.
> 
> If that buffer hits one hundred percent... the security system crashes. The gates unlock. And Kernel Zero executes a direct hardware override inside your room. 
> 
> You HAVE to balance your time. Solve code problems to keep the main battery alive, watch your physical doors for Rust-Byte and NullPointer, but never let that Watchdog gauge reach max. Send the heartbeat ping. Always keep the watchdog fed."

---

### Night 5: 11:00 PM — "The Clean Wipe"
*(Sirens distant, low hum of warning claxons)*

> **Admin Kaelen:**
> "Hey... this is Kaelen. 
> 
> Look, I’m not supposed to be recording this. The institute directors found out I've been giving instructions to the night contractors. They’re initiating a full server purge at six AM tomorrow. 
> 
> That means tonight, the power grid is operating at thirty percent baseline efficiency. All five units are running at full speed. Their safety limiters are off. Deadlock is aggressively pushing the right door. NullPointer is restless in Cabin Two. Echo is hunting the cabinet. And Kernel Zero is overloading the watchdog timer at double speed.
> 
> If you make it to six AM... the lab shuts down forever. You get your contractor paycheck, and we both walk out of here alive. 
> 
> Write clean code tonight, Sentinel. No bugs. No mistakes. Don't let them breach."

---

## 8. NIGHT-BY-NIGHT ESCALATION MATRIX

**All five units are active from the first minute of Night 1.** Nothing is switched off on early nights; instead, every unit becomes faster, more frequent, and less forgiving each night. Night 1 is survivable because aggression is very low, not because units are missing.

| Night | Active Entities | AI Aggression Level | Battery Drain Multiplier | NullPointer Reaction Window | Watchdog Fill Speed | Echo Cabinet Raids | Code Difficulty |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Night 1** | All 5 units | Very Low (1–3) | 1.0x | 2.5 s | 1.0x | Rare | Basic Syntax & Logic |
| **Night 2** | All 5 units | Low (3–6) | 1.1x | 2.3 s | 1.2x | Occasional | Arrays & Strings |
| **Night 3** | All 5 units | Medium (6–10) | 1.25x | 2.0 s | 1.4x | Regular | Stacks, Queues, Binary Search |
| **Night 4** | All 5 units | High (10–15) | 1.4x | 1.8 s | 1.7x | Frequent | Recursion & Time Complexity |
| **Night 5** | All 5 units | Maximum (15–20) | 1.6x | 1.5 s | 2.0x | Relentless | Dynamic Programming & Graph Traversal |

*Reaction-window, watchdog and raid values are starting points to be tuned in playtesting.*

**Tape structure:** each night's cassette log spotlights one unit in depth (Night 1: overview + Rust-Byte, Night 2: NullPointer, Night 3: Echo & Deadlock, Night 4: Kernel Zero, Night 5: everything at once), but all five are hunting on every night.

---

## 9. USER INTERFACE & AUDITORY DESIGN

### 9.1 Visual Aesthetic
* **Retro-Industrial Brutalism**: Dark charcoal backgrounds (`#0d0c10`), thin high-contrast borders, monochrome amber or phosphor-green CRT monitors.
* **Camera Monitor HUD**: Scanlines, grain filter, battery percentage gauge in top-left, interactive minimap in bottom-right.
* **Terminal IDE HUD**: Minimalist split code editor, compile button (`[EXECUTE / CTRL+ENTER]`), test case status indicators (`PASS (+5%)` in green, `FAIL (-7%)` in red spark flash).

### 9.2 Key Audio Cues (Vital for Survival)
* **Footstep Hierarchy**:
  * *Heavy metallic scrape*: Rust-Byte approaching Left Door.
  * *Rapid thunderous metallic clatter*: NullPointer sprinting down the Big Hall.
  * *Deep hollow metallic bang*: Deadlock at the Right Door.
  * *Electric crackle & dial-up screech*: Echo in The Cabinet.
  * *Rhythmic ticking / alarm buzz*: Kernel Zero's Watchdog Buffer nearing 90%.

---

## 10. TECHNICAL ARCHITECTURE & STACK RECOMMENDATIONS

* **Engine / Frontend**: HTML5 Canvas + Web Audio API + React/TypeScript or Electron (desktop).
* **Code Execution**: In-browser WebAssembly-based code runner (Pyodide for Python, native JS sandbox for JavaScript) for zero-latency instant compilation.
* **State Machine**: Finite State Machine (FSM) controlling entity positions (Cabin -> Hallway Node A -> Hallway Node B -> Door Blindspot -> Attack).
