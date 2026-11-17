import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE_DIR, "Five_Nights_At_I3_Game_Design_Document.pdf")
# Creepster (Font Diner) is licensed under the SIL Open Font License; see fonts/Creepster-OFL.txt
FONT_PATH = os.path.join(BASE_DIR, "fonts", "Creepster-Regular.ttf")

# Register Horror Display Font
pdfmetrics.registerFont(TTFont('Creepster', FONT_PATH))

# --- COLOR PALETTE ---
C_BG = colors.HexColor("#08070C")          # Void Pitch Background
C_PANEL = colors.HexColor("#121118")       # Dark Charcoal Panel
C_PANEL_ALT = colors.HexColor("#191824")   # Secondary Panel
C_BORDER = colors.HexColor("#2C293A")      # Muted Structural Steel
C_GREEN = colors.HexColor("#00FF66")       # Terminal Phosphor Green (+5% Battery)
C_RED = colors.HexColor("#FF2247")         # Fatal Error / Warning Red (-7% Battery)
C_CYAN = colors.HexColor("#00E5FF")        # CCTV HUD / Electric Cyan
C_AMBER = colors.HexColor("#FF9900")       # Rust / Caution Amber
C_TEXT_LIGHT = colors.HexColor("#EAE8F2")  # Off-white Body Text
C_TEXT_MUTED = colors.HexColor("#8E8B9E")  # Secondary Grey
C_WHITE = colors.HexColor("#FFFFFF")

def draw_background_canvas(canvas_obj, doc_obj):
    """Paints deep void background before any flowables are placed."""
    canvas_obj.saveState()
    w, h = doc_obj.pagesize
    canvas_obj.setFillColor(C_BG)
    canvas_obj.rect(0, 0, w, h, fill=1, stroke=0)
    canvas_obj.restoreState()

class NumberedCanvas(canvas.Canvas):
    """Draws HUD border frame, tactical crosshairs, headers, and dynamic page numbering."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_overlay_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_overlay_decorations(self, total_pages):
        self.saveState()
        w, h = self._pagesize
        margin = 22

        # Technical Outer Border Frame (stroke only)
        self.setStrokeColor(C_BORDER)
        self.setLineWidth(1)
        self.rect(margin, margin, w - 2*margin, h - 2*margin, stroke=1, fill=0)

        # Tactical Corner Crosshairs
        self.setStrokeColor(C_RED if self._pageNumber == 1 else C_CYAN)
        self.setLineWidth(1.8)
        c_len = 10
        # Top-Left
        self.line(margin, h - margin, margin + c_len, h - margin)
        self.line(margin, h - margin, margin, h - margin - c_len)
        # Top-Right
        self.line(w - margin, h - margin, w - margin - c_len, h - margin)
        self.line(w - margin, h - margin, w - margin, h - margin - c_len)
        # Bottom-Left
        self.line(margin, margin, margin + c_len, margin)
        self.line(margin, margin, margin, margin + c_len)
        # Bottom-Right
        self.line(w - margin, margin, w - margin - c_len, margin)
        self.line(w - margin, margin, w - margin, margin + c_len)

        # Top Header Bar
        self.setFont("Creepster", 9)
        self.setFillColor(C_CYAN)
        self.drawString(margin + 8, h - margin + 4, "LAB I-3 CONTAINMENT ARCHIVE // SYSTEMS PROTOCOL v1.0")
        self.setFillColor(C_RED)
        self.drawRightString(w - margin - 8, h - margin + 4, "CLASSIFIED // EYES ONLY")

        # Bottom Footer Bar
        self.setFont("Creepster", 9)
        self.setFillColor(C_TEXT_MUTED)
        self.drawString(margin + 8, margin - 11, "PROJECT: FIVE NIGHTS AT I-3 | MASTER DESIGN DOCUMENT")
        page_str = f"SECTION RECORD - PAGE {self._pageNumber} OF {total_pages}"
        self.drawRightString(w - margin - 8, margin - 11, page_str)

        self.restoreState()


def build_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=letter,
        leftMargin=30,
        rightMargin=30,
        topMargin=34,
        bottomMargin=34
    )

    # --- CUSTOM STYLES (ENLARGED & HORROR FONT INTEGRATED) ---
    title_style = ParagraphStyle(
        'CoverTitle',
        fontName='Creepster',
        fontSize=32,
        leading=38,
        textColor=C_RED,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        fontName='Creepster',
        fontSize=15,
        leading=20,
        textColor=C_CYAN,
        alignment=TA_CENTER
    )

    h1_style = ParagraphStyle(
        'H1_Custom',
        fontName='Creepster',
        fontSize=16,
        leading=22,
        textColor=C_CYAN,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2_Custom',
        fontName='Creepster',
        fontSize=12.5,
        leading=17,
        textColor=C_GREEN,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'H3_Custom',
        fontName='Creepster',
        fontSize=11,
        leading=15,
        textColor=C_AMBER,
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=C_TEXT_LIGHT,
        spaceAfter=4
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=14,
        textColor=C_WHITE,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        fontName='Courier',
        fontSize=9,
        leading=12,
        textColor=C_GREEN
    )

    tape_script_style = ParagraphStyle(
        'Tape_Style',
        fontName='Courier-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#D4D1E0")
    )

    lore_box_style = ParagraphStyle(
        'Lore_Style',
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=C_TEXT_LIGHT
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        fontName='Creepster',
        fontSize=11,
        leading=14,
        textColor=C_WHITE
    )

    table_body_style = ParagraphStyle(
        'TableBody',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=C_TEXT_LIGHT
    )

    story = []

    # =========================================================================
    # PAGE 1: TITLE & THE INCIDENT AT LAB I-3 (THE FULL STORY)
    # =========================================================================
    story.append(Paragraph("/// INCIDENT REPORT: PROJECT SINGULARITY ///", ParagraphStyle('TopStamp', fontName='Creepster', fontSize=11, leading=14, textColor=C_RED, alignment=TA_CENTER)))
    story.append(Spacer(1, 4))
    story.append(Paragraph("FIVE NIGHTS AT I-3", title_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("MASTER GAME DESIGN DOCUMENT & NARRATIVE ARCHIVE", subtitle_style))
    story.append(Spacer(1, 8))

    # Confidential Metadata Bar
    conf_data = [
        [Paragraph("<font color='#FF2247'><b>STATUS:</b> LEVEL-5 QUARANTINE</font> | <font color='#00E5FF'><b>FACILITY:</b> LAB I-3 AUTONOMOUS COMPUTING</font> | <font color='#00FF66'><b>SHIFT:</b> 23:00 - 06:00 (7 HRS)</font>", ParagraphStyle('Conf', fontName='Courier', fontSize=8, leading=10, textColor=C_TEXT_LIGHT, alignment=TA_CENTER))]
    ]
    t_conf = Table(conf_data, colWidths=[552])
    t_conf.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_PANEL),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_conf)
    story.append(Spacer(1, 10))

    # --- SECTION 1: COMPLETE STORYLINE & NARRATIVE BIBLE ---
    story.append(Paragraph("1. THE CLASSIFIED STORY: THE INCIDENT AT LAB I-3", h1_style))
    
    lore_p1 = (
        "<b>THE GENESIS — PROJECT SINGULARITY:</b><br/>"
        "Hidden beneath the prestigious Department of Advanced Robotics and Computation, <b>Lab I-3</b> was constructed as an air-gapped incubator for next-generation autonomous neural computing. Five senior research fellows were sealed inside private soundproof cabins (Cabins 1 through 5). Their directive was revolutionary: construct five specialized neural-mechanical automata capable of real-time machine-code optimization, hardware threading, and autonomous error recovery."
    )
    lore_p2 = (
        "<b>THE DISASTER — THE FATAL SEGMENTATION FAULT:</b><br/>"
        "On November 17 at exactly <b>11:42 PM</b>, an experimental multi-threaded synchronization routine collapsed. The catastrophic event—codenamed the <b>Fatal Segmentation Fault</b>—triggered a runaway buffer overflow across all five cabins. The physical animatronic chassis absorbed corrupt, recursive kernel loops. When emergency crews breached the lab at dawn, the cabins were empty of human personnel. The researchers had vanished without a trace, but the machines inside Cabins 1 through 5 remained permanently energized, twitching in low-power idle loops."
    )
    lore_p3 = (
        "<b>THE WHY: WHY THE LAB STILL RUNS & WHY THEY HUNT:</b><br/>"
        "The university cannot decommission Lab I-3 because its deep underground cluster hosts the entire campus's legacy research simulations and grading engines. Every night at <b>11:00 PM</b>, the campus cuts municipal power and switches Lab I-3 to a volatile auxiliary capacitor grid. In this low-voltage environment, the five units awaken. Trapped in an endless error-recovery routine, their corrupted firmware interprets human biometric heat signatures as <b>rogue unhandled memory leaks</b> that must be violently purged from physical reality."
    )
    lore_p4 = (
        "<b>YOUR ROLE — THE NIGHT SYSTEMS SENTINEL:</b><br/>"
        "Lured by an exorbitantly high contractor payout, you accept the night shift from <b>11:00 PM to 6:00 AM</b>. Sealed inside the central Security Cockpit, you are equipped with a surveillance monitor, halogen blindspot lights, pneumatic blast gates, and an IDE terminal connected to the cluster. To prevent the volatile capacitor battery from draining to 0%, you must continuously solve algorithmic bug tickets. Every correct fix recharges the generator by <b>+5%</b>; every error triggers an electrical surge costing <b>-7%</b>. Survive 5 nights until the 6:00 AM full server wipe—or become another unhandled exception."
    )

    story_table_data = [
        [Paragraph(lore_p1, lore_box_style)],
        [Paragraph(lore_p2, lore_box_style)],
        [Paragraph(lore_p3, lore_box_style)],
        [Paragraph(lore_p4, lore_box_style)]
    ]
    t_story = Table(story_table_data, colWidths=[552])
    t_story.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_PANEL),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('LINELEFT', (0,0), (0,-1), 2.5, C_RED),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_story)
    story.append(Spacer(1, 8))

    # Atmospheric Blackbox Telemetry Box
    blackbox_text = (
        "<b>/// DECLASSIFIED BLACKBOX LOG: 11:42:19 PM ///</b><br/>"
        "<font color='#FF2247'>&gt; CRITICAL STACK OVERFLOW DETECTED AT CLUSTER NODE 0x7FFF8000</font><br/>"
        "<font color='#00E5FF'>&gt; CABIN 1-5 ACTUATOR RELAYS FORCED HIGH (CURRENT SPIKE: 480A)</font><br/>"
        "<font color='#FF9900'>&gt; WARNING: HUMAN VITAL BIOMETRICS CLASSIFIED AS 'UNHANDLED THREAD LEAK'</font><br/>"
        "<font color='#00FF66'>&gt; DIRECTIVE: RESTART RECOVERY PROTOCOL. PURGE CORRUPT THREADS AT ALL COSTS.</font><br/>"
        "<i>NOTICE TO NIGHT CONTRACTORS: Under Institute Directive 404, contractors entering Lab I-3 after 23:00 hours waive all institutional liability. In the event of a power blackout, remain seated in the cockpit. Do NOT attempt to run down the Big Hall.</i>"
    )
    t_blackbox = Table([[Paragraph(blackbox_text, ParagraphStyle('BBStyle', fontName='Courier', fontSize=8, leading=11, textColor=C_TEXT_LIGHT))]], colWidths=[552])
    t_blackbox.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_PANEL_ALT),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('LINELEFT', (0,0), (0,-1), 2.5, C_AMBER),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_blackbox)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: VISUAL IDENTITY, COLOR THEMES, FONTS & SURVIVAL ENGINE
    # =========================================================================
    story.append(Paragraph("2. VISUAL IDENTITY: COLOR PALETTE & TYPOGRAPHY", h1_style))
    story.append(Paragraph("<i>Five Nights at I-3</i> blends 90s analog CRT surveillance horror with clinical mainframe terminal aesthetics. The following palette defines atmospheric lighting, UI states, and psychological tension:", body_style))
    story.append(Spacer(1, 4))

    palette_data = [
        ["COLOR SWATCH / NAME", "HEX CODE", "RGB MAPPING", "PSYCHOLOGICAL & GAMEPLAY ROLE"],
        ["VOID ABYSS (Base Canvas)", "#08070C", "8, 7, 12", "Dominant background; creates claustrophobic darkness & screen glare."],
        ["TERMINAL PHOSPHOR", "#00FF66", "0, 255, 102", "Code compiler success indicator, accepted test cases, power gain (+5%)."],
        ["BREAKER BLOOD (Alert)", "#FF2247", "255, 34, 71", "Fatal exceptions, compile crashes (-7%), door lock engaged, jumpscares."],
        ["CCTV SCAN CYAN", "#00E5FF", "0, 229, 255", "Surveillance HUD, camera scanlines, static interference, light beams."],
        ["DECAY AMBER / RUST", "#FF9900", "255, 153, 0", "Critical battery warning (<20%), Unit 01 rusted chassis, caution tape."],
        ["CONTAINMENT SLATE", "#282535", "40, 37, 53", "Heavy blast gates, dividing walls, structural wireframes, panel boxes."]
    ]
    t_palette = Table([[Paragraph(cell, table_header_style if i==0 else (ParagraphStyle('CodeSwatch', fontName='Courier-Bold', fontSize=8.5, leading=11, textColor=C_GREEN if j==1 else C_TEXT_LIGHT) if j in (1,2) else table_body_style)) for j, cell in enumerate(row)] for i, row in enumerate(palette_data)], colWidths=[140, 65, 75, 272])
    t_palette.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PANEL_ALT),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_palette)
    story.append(Spacer(1, 8))

    # Typography Hierarchy
    font_data = [
        ["CATEGORY", "FONT SELECTION", "GAMEPLAY USAGE & VISUAL INTENT"],
        ["Horror / Title Display", "Creepster (SIL OFL)", "Game logo, section titles, villain names, 12 AM transition titles."],
        ["Terminal & System Code", "VT323 / JetBrains Mono / Courier", "Code editor, CCTV camera IDs, battery metrics, compiler logs."],
        ["Technical UI & HUD", "Space Grotesk / Inter / Helvetica", "Door/Light switches, status text, settings & keybindings."]
    ]
    t_font = Table([[Paragraph(cell, table_header_style if i==0 else table_body_style) for j, cell in enumerate(row)] for i, row in enumerate(font_data)], colWidths=[130, 160, 262])
    t_font.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PANEL_ALT),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_font)
    story.append(Spacer(1, 10))

    # --- SECTION 3: SURVIVAL MECHANICS & BATTERY ENGINE ---
    story.append(Paragraph("3. CORE SURVIVAL DYNAMICS & BATTERY ARITHMETIC", h1_style))
    story.append(Paragraph("The player must survive from <b>11:00 PM to 6:00 AM</b>. Power is finite and depletes through surveillance, lighting, and heavy blast doors. The player restores power by compiling clean code and suffers rapid surges for syntax errors:", body_style))
    story.append(Spacer(1, 4))

    mech_data = [
        ["COMPONENT / EVENT", "POWER RATE / IMPACT", "TACTICAL FUNCTION & CONSEQUENCE"],
        ["Facility Idle Baseline", "-0.10% / sec", "Guarantees that passive waiting will drain battery to zero."],
        ["CCTV Camera Monitor", "-0.40% / sec", "Used to track entity movement across Cabins 1 to 5 and the Big Hall."],
        ["Halogen Door Spotlight", "-1.00% / sec", "Blinds and overloads optical sensors; freezes or retreats approaching units."],
        ["One Blast Gate Closed", "-1.80% / sec", "100% impenetrable barrier against physical entry into the office."],
        ["Both Blast Gates Closed", "-3.80% / sec", "Full lockdown; the fastest way to burn through the remaining power."],
        ["Echo in The Cabinet", "2x passive drain", "Unchecked relay sabotage doubles the base drain rate until Echo is purged."],
        ["CORRECT CODE COMPILED", "+5.00% INSTANT RECHARGE", "Submitting correct algorithmic fixes charges auxiliary generator capacitor."],
        ["COMPILATION / TEST ERROR", "-7.00% BREAKER SURGE", "Syntax errors or runtime crashes trip high-voltage breakers, losing power."]
    ]
    t_mech = Table([[Paragraph(cell, table_header_style if i==0 else (ParagraphStyle('Gain', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=C_GREEN) if "+5.00%" in cell else (ParagraphStyle('Loss', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=C_RED) if "-7.00%" in cell else table_body_style))) for j, cell in enumerate(row)] for i, row in enumerate(mech_data)], colWidths=[140, 125, 287])
    t_mech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PANEL_ALT),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_mech)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: MAP LAYOUT & THE 5 VILLAIN DOSSIERS
    # =========================================================================
    story.append(Paragraph("4. FACILITY SPATIAL LAYOUT & SURVEILLANCE MATRIX", h1_style))
    story.append(Paragraph("Lab I-3 is partitioned into 8 networked surveillance zones channeling entities from northern containment cabins through the Big Hall toward the office blind spots:", body_style))
    story.append(Spacer(1, 4))

    map_diagram = [
        ["CAM 04: CABIN 1\n(Rust-Byte / Shuffler)", "CAM 01: BIG HALL (NORTH)\nCentral Corridor Junction", "CAM 05: CABIN 2\n(NullPointer / Sprinter)"],
        ["CAM 06: CABIN 3\n(Echo / Cabinet Saboteur)", "CAM 03: THE CABINET\nElectrical & Relay Locker", "CAM 07: CABIN 4\n(Deadlock / Shadow Stalker)"],
        ["LEFT SECURITY GATE\nBlast Door + Spotlight", "CAM 08: CABIN 5 (ISOLATION)\nKernel Zero Containment Core", "RIGHT SECURITY GATE\nBlast Door + Spotlight"],
        ["", "SECURITY COCKPIT (PLAYER)\nDual Workstation: CCTV HUD & Real-time IDE", ""]
    ]
    t_map = Table([[Paragraph(f"<b>{cell}</b>" if cell else "", ParagraphStyle('MapNode', fontName='Courier-Bold', fontSize=8, leading=10.5, textColor=C_CYAN if "CAM" in cell else (C_RED if "GATE" in cell else (C_GREEN if "SECURITY COCKPIT" in cell else C_TEXT_LIGHT)), alignment=TA_CENTER)) for cell in row] for row in map_diagram], colWidths=[184, 184, 184])
    t_map.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_PANEL),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_map)
    story.append(Spacer(1, 10))

    # --- SECTION 5: VILLAIN DOSSIERS ---
    story.append(Paragraph("5. CLASSIFIED VILLAIN DOSSIERS & AI MOVEMENT PROFILES", h1_style))
    
    villains = [
        {
            "cabin": "CABIN 1", "name": "THE DEPRECATED ('Rust-Byte')", "counter": "Bonnie Archetype",
            "desc": "Heavy rusted copper frame with exposed servomotors and dragging hydraulic gait. Approaches via Big Hall North to the Left Doorway.",
            "audio": "Metallic dragging clatter, wheezing hydraulic release.",
            "counter_strat": "Left Light overloads ocular tracking. Slam LEFT GATE if seen at door; retreats after 3 bangs."
        },
        {
            "cabin": "CABIN 2", "name": "NULLPOINTER ('Vector')", "counter": "Foxy Archetype",
            "desc": "Stripped chrome exoskeleton equipped with pneumatic sprint servos. 3 visual stages inside Cabin 2 (Hiding -> Peeking -> Empty/Sprinting).",
            "audio": "Violent mechanical clatter, thunderous sprint footsteps down the corridor.",
            "counter_strat": "Check Cabin 2 regularly to stall. If Cabin 2 is empty, slam LEFT GATE immediately (2.5s reaction window)."
        },
        {
            "cabin": "CABIN 3", "name": "GLITCH_DAEMON ('Echo')", "counter": "Chica / Balloon Boy Hybrid",
            "desc": "Distorted multi-speaker optical head. Infiltrates THE CABINET in the hall to hijack power relays and corrupt terminal data.",
            "audio": "Modem screeching, ear-piercing electronic feedback.",
            "counter_strat": "Scrambles IDE text & doubles drain. Strobe CAM 03 light or execute a quick terminal socket purge."
        },
        {
            "cabin": "CABIN 4", "name": "THE THREAD-LOCKER ('Deadlock')", "counter": "Freddy Archetype",
            "desc": "Massive matte-black stealth unit. Advances strictly in shadows when player is looking away or typing in the code editor.",
            "audio": "Low-frequency sub-bass hum, mocking synthetic glitched laughter.",
            "counter_strat": "Maintain active camera sweep on Right Corridor. Spot with Right Light; slam RIGHT GATE on glowing eyes."
        },
        {
            "cabin": "CABIN 5", "name": "THE ROOT DAEMON ('Kernel Zero')", "counter": "Puppet / Golden Freddy Boss",
            "desc": "Sealed in isolation chamber in Cabin 5. A red 'WATCHDOG BUFFER' gauge fills steadily on the IDE screen every second.",
            "audio": "Rapid digital alarm countdown, distorted vocal synthesis.",
            "counter_strat": "Bypasses blast doors. Player must periodically send a Heartbeat Ping or solve micro-test to flush the buffer."
        }
    ]

    for v in villains:
        v_card = [
            [Paragraph(f"{v['cabin']}: {v['name']}", ParagraphStyle('VName', fontName='Creepster', fontSize=12, leading=15, textColor=C_RED)), Paragraph(f"ROLE: {v['counter']}", ParagraphStyle('VRole', fontName='Creepster', fontSize=10, leading=13, textColor=C_CYAN, alignment=TA_RIGHT))],
            [Paragraph(f"<b>BEHAVIOR:</b> {v['desc']}<br/><b>AUDIO CUES:</b> <font color='#FF9900'>{v['audio']}</font><br/><b>CONTAINMENT:</b> <font color='#00FF66'>{v['counter_strat']}</font>", body_style), ""]
        ]
        t_v = Table(v_card, colWidths=[370, 182])
        t_v.setStyle(TableStyle([
            ('SPAN', (0,1), (1,1)),
            ('BACKGROUND', (0,0), (-1,-1), C_PANEL),
            ('BOX', (0,0), (-1,-1), 1, C_BORDER),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(t_v)
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: CASSETTE LOG TRANSCRIPTS
    # =========================================================================
    story.append(Paragraph("6. CASSETTE LOG TRANSCRIPTS: FORMER SYSADMIN KAELEN", h1_style))
    story.append(Paragraph("At 11:00 PM each night, a cassette deck on the desk plays recorded instructions left by the previous senior administrator:", body_style))
    story.append(Spacer(1, 4))

    scripts = [
        ("NIGHT 1 (11:00 PM) - 'ONBOARDING & CONTAINMENT PROTOCOLS'", 
         "\"Uh, hello? Hello, hello! Welcome to your first shift as Night Sentinel for Lab I-3... Campus rumors about the 'Fatal Segfault' are mostly garbage. Mostly. Your job is simple: five cabins hold decommissioned AI chassis. When campus servers shut down at eleven, their corrupted idle loops interpret human biometrics as memory leaks to be purged.\n\nAnd I won't lie to you: all five are awake tonight. First night they're sluggish, barely booted, but watch every camera and keep that watchdog gauge low. Keep your gates ready, flash the lights to blind their optics, and keep compiling code on your terminal. Every correct fix recharges five percent battery. Every error drops seven percent. Double check your syntax before you compile.\""),
        ("NIGHT 2 (11:00 PM) - 'THE SPRINTER IN CABIN TWO'", 
         "\"Hey, you survived! Now listen: Cabin Two... NullPointer. That unit has active pneumatic sprint servos. Check Camera Five regularly. If you see the curtains open, pay attention. If that cabin is empty, drop whatever function you're coding and slam that LEFT GATE down immediately! You have about two seconds before he hits the steel door. Speed kills, but a syntax error will kill you faster.\""),
        ("NIGHT 3 (11:00 PM) - 'CABINET STATIC & THE SHADOW'", 
         "\"Can you hear that high-pitch whine? That's Unit Three—Echo. She loves electrical relays. If she climbs inside The Cabinet out in the hall, she’ll scramble your code terminal into corrupt ASCII and double your battery drain. Strobe the cabinet light or purge the socket from your terminal.\n\nAnd don't let Deadlock catch you distracted—he sneaks down the right hall only while you're busy coding. Check your right blind spot, Sentinel!\""),
        ("NIGHT 4 (11:00 PM) - 'THE WATCHDOG OVERFLOW'", 
         "\"Things get grim tonight. Heavy server load means Cabin Five gets hungry: Kernel Zero. You can't stop it with doors or lights. That red 'Watchdog Buffer' bar on your IDE you've been feeding all week? Tonight it fills a lot faster. If it hits one hundred percent, it crashes your security system and teleports into your room.\n\nAlways feed the watchdog. Ping the heartbeat script between door checks, or you're done.\""),
        ("NIGHT 5 (11:00 PM) - 'THE CLEAN WIPE'", 
         "\"This is Kaelen. The institute ordered a complete server wipe at six AM tomorrow. All five units are running at full speed without limiters. The power grid is unstable. If you make it to six AM, the lab shuts down forever and we both walk out alive.\n\nWrite clean code tonight, Sentinel. No bugs. No mistakes. Don't let them breach.\"")
    ]

    for title, text in scripts:
        story.append(Paragraph(title, h2_style))
        s_box = [[Paragraph(text.replace('\n', '<br/>'), tape_script_style)]]
        t_s = Table(s_box, colWidths=[552])
        t_s.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), C_PANEL),
            ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
            ('LINELEFT', (0,0), (0,-1), 2.5, C_CYAN),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_s)
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: NIGHT MATRIX, CODING CHALLENGES & JUMPSCARE FAILURE PROTOCOL
    # =========================================================================
    story.append(Paragraph("7. NIGHT ESCALATION MATRIX & AI BALANCING", h1_style))
    story.append(Paragraph("<b>All five entities are active from the first minute of Night 1.</b> Nothing is switched off on early nights; instead every unit grows faster, more frequent, and less forgiving each night, alongside harder code challenges. Night 1 is survivable because aggression is very low, not because units are missing:", body_style))
    story.append(Spacer(1, 4))

    night_data = [
        ["NIGHT", "ACTIVE", "AGGRESSION", "DRAIN", "SPRINT WINDOW", "WATCHDOG FILL", "CODE CHALLENGE TYPES"],
        ["Night 1", "All 5", "Very Low (1 - 3)", "1.00x", "2.5 s", "1.0x", "Basic Syntax Corrections & Index Boundary fixes"],
        ["Night 2", "All 5", "Low (3 - 6)", "1.10x", "2.3 s", "1.2x", "String manipulation & Array traversal assertions"],
        ["Night 3", "All 5", "Medium (6 - 10)", "1.25x", "2.0 s", "1.4x", "Stacks, Queues, Binary Search midpoint bugs"],
        ["Night 4", "All 5", "High (10 - 15)", "1.40x", "1.8 s", "1.7x", "Recursion & Time Complexity"],
        ["Night 5", "All 5", "MAXIMUM (15 - 20)", "1.60x", "1.5 s", "2.0x", "Dynamic Programming & Graph Traversal"]
    ]
    t_night = Table([[Paragraph(cell, table_header_style if i==0 else table_body_style) for j, cell in enumerate(row)] for i, row in enumerate(night_data)], colWidths=[52, 48, 88, 48, 64, 70, 182])
    t_night.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PANEL_ALT),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_night)
    story.append(Spacer(1, 10))

    # --- SECTION 8: THE CODING ENGINE ---
    story.append(Paragraph("8. THE CODING ENGINE & MICRO-TASK TAXONOMY", h1_style))
    story.append(Paragraph("The terminal features rapid micro-challenges (supporting Python, JavaScript, or C++) designed to take 10 to 30 seconds to solve, creating an agonizing risk/reward loop while entities stalk the halls:", body_style))
    story.append(Spacer(1, 4))

    task_data = [
        ["TASK TYPE", "EXAMPLE CODE SNIPPET", "TIME", "BATTERY PAYOFF"],
        ["Type 1: Bug Hunter\n(Off-by-One / Syntax)", "Fix loop limit: for i in range(len(arr) + 1): -> len(arr)", "10-15s", "<font color='#00FF66'>+5% Instant</font>"],
        ["Type 2: Micro-Algorithm\n(Logic & Pointers)", "Fix binary search mid: mid = left + (right - left) // 2", "20-30s", "<font color='#00FF66'>+5% Instant</font>"],
        ["Type 3: Output Predictor\n(Mental Tracing)", "Trace stack after 3 push & 1 pop: Return top element", "~10s", "<font color='#00FF66'>+5% Instant</font>"],
        ["Type 4: Watchdog Heartbeat\n(Cabin 5 Neutralizer)", "Format regex verification token or execute flush_kernel()", "5-10s", "Flushes Buffer to 0%"]
    ]
    t_task = Table([[Paragraph(cell, table_header_style if i==0 else (ParagraphStyle('GainT', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=C_GREEN) if "+5%" in cell else table_body_style)) for j, cell in enumerate(row)] for i, row in enumerate(task_data)], colWidths=[125, 237, 70, 120])
    t_task.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PANEL_ALT),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_task)
    story.append(Spacer(1, 10))

    # --- SECTION 9: JUMPSCARE & 0% BLACKOUT PROTOCOL ---
    story.append(Paragraph("9. JUMPSCARE & 0% BLACKOUT SYSTEM FAILURE", h1_style))
    
    blackout_text = (
        "<b>WHEN POWER HITS 0.0%:</b><br/>"
        "1. <b>Breaker Detonation:</b> All office fluorescent tubes, terminal monitors, and CCTV cameras instantly extinguish with a violent electrical arc pop.<br/>"
        "2. <b>Fail-Safe Release:</b> The Left and Right blast gates release pneumatic pressure and automatically swing wide open.<br/>"
        "3. <b>The Anticipation:</b> 3 to 6 seconds of pitch darkness accompanied by distant, heavy footsteps echoing down the Big Hall.<br/>"
        "4. <b>The Jumpscare:</b> Glowing cyan or amber ocular LEDs flicker to life in the Left Doorway, followed by an aggressive screen-filling jumpscare animation and high-gain audio screech.<br/>"
        "5. <b>Post-Mortem Screen:</b> <i>KERNEL PANIC: UNHANDLED THREAD CORRUPTION AT ADDR 0x00000000</i>. Shows survival time and failed code analytics."
    )
    b_box = [[Paragraph(blackout_text, body_style)]]
    t_b = Table(b_box, colWidths=[552])
    t_b.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_PANEL),
        ('BOX', (0,0), (-1,-1), 1, C_RED),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_b)
    story.append(Spacer(1, 8))

    # Official Sign-off Stamp
    stamp_data = [
        [Paragraph("SYSTEM DOCUMENT APPROVED: INSTITUTE SENTINEL OVERSIGHT | AUTHORIZATION: ROOT_CLEARANCE_LVL5", ParagraphStyle('Stamp', fontName='Creepster', fontSize=9, leading=12, textColor=C_CYAN, alignment=TA_CENTER))]
    ]
    t_stamp = Table(stamp_data, colWidths=[552])
    t_stamp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_PANEL_ALT),
        ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_stamp)

    # Build Document with background callback
    doc.build(story, canvasmaker=NumberedCanvas, onFirstPage=draw_background_canvas, onLaterPages=draw_background_canvas)
    print("PDF generation complete: " + PDF_PATH)

if __name__ == "__main__":
    build_pdf()
