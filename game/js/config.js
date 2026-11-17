// ===== Tunables: everything balance-related lives here =====
const CONFIG = {
  secondsPerHour: 70,          // 11 PM -> 6 AM = 7 hours = 490 s
  power: {
    idle: 0.10,                // % per second
    camera: 0.40,
    light: 1.00,               // per light
    oneGate: 1.80,
    bothGates: 3.80,
    reward: 5,                 // correct code
    penalty: 7,                // wrong code
    strobe: 2,                 // one-off cost of strobing the cabinet
    sprintHit: 1,              // NullPointer slamming into a closed gate
  },
  watchdogBaseSeconds: 240,    // seconds to fill the watchdog at 1.0x
};

// Night-by-night escalation (all 5 robots active every night)
const NIGHTS = [
  null,
  { aggr: [1, 3],   drain: 1.00, sprintWindow: 2.5, watchdog: 1.0, echoMul: 0.6, puzzle: 1 },
  { aggr: [3, 6],   drain: 1.10, sprintWindow: 2.3, watchdog: 1.2, echoMul: 0.8, puzzle: 2 },
  { aggr: [6, 10],  drain: 1.25, sprintWindow: 2.0, watchdog: 1.4, echoMul: 1.0, puzzle: 3 },
  { aggr: [10, 15], drain: 1.40, sprintWindow: 1.8, watchdog: 1.7, echoMul: 1.3, puzzle: 4 },
  { aggr: [15, 20], drain: 1.60, sprintWindow: 1.5, watchdog: 2.0, echoMul: 1.6, puzzle: 5 },
];

// Cameras. x/y/s = where a robot stands in that photo (1280x720) and how big it is.
const CAMS = {
  cam01:  { label: "CAM 01  BIG HALL",          img: "cam01",  key: "1", spots: [{ x: 790, y: 470, s: 0.42 }, { x: 600, y: 455, s: 0.36 }, { x: 380, y: 520, s: 0.5 }] },
  cam02a: { label: "CAM 02A WEST CORRIDOR",     img: "cam02a", key: "2", spots: [{ x: 690, y: 600, s: 0.72 }] },
  cam02b: { label: "CAM 02B EAST WING",         img: "cam02b", key: "3", spots: [{ x: 650, y: 520, s: 0.5 }] },
  cam03:  { label: "CAM 03  THE CABINET",       img: "cam03",  key: "4", spots: [{ x: 640, y: 780, s: 1.0 }] },
  cam04:  { label: "CAM 04  CABIN 1",           img: "cam04",  key: "5", spots: [{ x: 1000, y: 610, s: 0.8 }] },
  cam05:  { label: "CAM 05  CABIN 2",           img: "cam05",  key: "6", spots: [{ x: 1080, y: 640, s: 0.85 }] },
  cam06:  { label: "CAM 06  CABIN 3",           img: "cam06",  key: "7", spots: [{ x: 330, y: 670, s: 0.85 }] },
  cam07:  { label: "CAM 07  CABIN 4",           img: "cam07",  key: "8", spots: [{ x: 700, y: 650, s: 0.72 }] },
  cam08:  { label: "CAM 08  CABIN 5 (ISOLATION)", img: "cam08", key: "9", spots: [{ x: 820, y: 640, s: 0.9 }] },
};

// Minimap layout (px inside the 310x230 map box)
const MAP_LAYOUT = {
  cam04:  { x: 0,   y: 0,   w: 92, h: 34, t: "04 CABIN 1" },
  cam05:  { x: 210, y: 0,   w: 92, h: 34, t: "05 CABIN 2" },
  cam06:  { x: 0,   y: 44,  w: 92, h: 34, t: "06 CABIN 3" },
  cam07:  { x: 210, y: 44,  w: 92, h: 34, t: "07 CABIN 4" },
  cam01:  { x: 102, y: 0,   w: 98, h: 78, t: "01 BIG HALL" },
  cam03:  { x: 0,   y: 88,  w: 92, h: 34, t: "03 CABINET" },
  cam08:  { x: 102, y: 88,  w: 98, h: 34, t: "08 CABIN 5" },
  cam02a: { x: 40,  y: 132, w: 80, h: 50, t: "02A WEST" },
  cam02b: { x: 182, y: 132, w: 80, h: 50, t: "02B EAST" },
};

// Cassette logs (subtitles), shown at the start of each night
const TAPES = [
  null,
  { title: "NIGHT 1 // WELCOME TO I-3", lines: [
    "Uh, hello? Hello, hello! Welcome to your first shift as Night Sentinel for Lab I-3.",
    "Campus rumors about the 'Fatal Segfault'? Mostly garbage. Mostly.",
    "Five cabins. Five old autonomous units. Their firmware thinks you're a memory leak that needs to be wiped.",
    "I won't lie to you: all five are awake tonight. First night they're sluggish. Barely booted.",
    "Rust-Byte walks to your LEFT door. Light him up. If he's there, slam the gate until he leaves.",
    "Your power drains constantly. Solve the code tickets on the terminal: correct is plus five, wrong is minus seven.",
    "And keep that red WATCHDOG bar low. Send the heartbeat. Always. See you at six.",
  ]},
  { title: "NIGHT 2 // THE SPRINTER", lines: [
    "Hey! You survived! Told you it wasn't that bad.",
    "Cabin Two. NullPointer. He hides behind the curtain, then he peeks... then he RUNS.",
    "Watching Cabin Two on CAM 05 slows him down. If that cabin is ever EMPTY...",
    "Drop everything and slam the LEFT gate. You've got about two seconds.",
    "Speed kills. But a syntax error will kill you faster.",
  ]},
  { title: "NIGHT 3 // STATIC IN THE CABINET", lines: [
    "Can you hear that whine? That's Echo, out of Cabin Three.",
    "She crawls into the battery cabinet. Cameras die. Your code turns to garbage. Power drain doubles.",
    "Strobe her out from CAM 03, or type the purge command on your terminal.",
    "And Deadlock... Cabin Four. He only moves when nobody's watching him. Or when you're busy typing.",
    "Check your RIGHT door, Sentinel. You won't hear him coming.",
  ]},
  { title: "NIGHT 4 // THE WATCHDOG", lines: [
    "Hey. If you made it to Thursday you're either a genius or the luckiest person on campus.",
    "Heavy server load tonight. Cabin Five gets hungry. Kernel Zero.",
    "No door stops it. No light. That watchdog bar is all that holds it back, and tonight it fills fast.",
    "If it hits one hundred... it's already in the room with you.",
  ]},
  { title: "NIGHT 5 // THE CLEAN WIPE", lines: [
    "This is Kaelen. I'm not supposed to be recording this.",
    "They're wiping the servers at six AM. All five units are running at full speed. No limiters.",
    "If you make it to six, the lab shuts down forever and we both walk out alive.",
    "Write clean code tonight, Sentinel. No bugs. No mistakes.",
    "...wait. Who's in Cabin Fi—",
  ]},
];

// The story, narrated while you walk across campus to the lab (Night 1 / New Game)
const STORY = { title: "ARCHIVE TAPE // PROJECT SINGULARITY", lines: [
  "Ten fifty-two P M. Everyone else went home hours ago.",
  "Five years ago, on November seventeenth, at eleven forty-two P M, something went wrong inside Lab I-3.",
  "Project Singularity. Five research fellows. Five machines that could rewrite their own code.",
  "A memory overflow tore through all five cabins. They called it the Fatal Segmentation Fault.",
  "When the emergency crews broke in at dawn, the researchers were gone. The machines were still running.",
  "The college never shut the lab down. Its servers still run the whole campus.",
  "So every night, someone has to sit inside, and keep them contained.",
  "Tonight, that someone is you. Walk to the lab. And don't look up at the windows.",
]};

// 3 AM phone calls from Kaelen (one per night). The last line of each is cut off by static.
const PHONE_CALLS = [
  null,
  { lines: [
    "Hey, it's Kaelen. Three A M. This is the hour they get... curious.",
    "Keep your eyes on the doors. And if you hear kids singing, that's not kids.",
  ]},
  { lines: [
    "Sentinel? Can you hear that? Someone is humming on this line.",
    "It's not me. I swear it's not me. Keep working, I'll call you back—",
  ]},
  { lines: [
    "Listen. The cameras lie sometimes. If you see something at the door, and then you don't...",
    "Trust the door. Not the screen. Never the scr—",
  ]},
  { lines: [
    "I went back to Cabin Five today. The glass was cracked. From the inside.",
    "If you hear the rhyme, feed the watchdog. Right now. Right n—",
  ]},
  { lines: [
    "They know your name now. They're saying it. Over and over.",
    "Don't let them in. Whatever you do, don't let them—",
  ]},
];
