/**
 * SVG symbol definitions for ALL PLECS circuit components.
 *
 * Domain color scheme:
 *   Electrical:   stroke=#222 (black), fill=white
 *   Thermal:      stroke=#4488bb (pale blue), fill=white
 *   Mechanical:   stroke=#7744aa (purple), fill=white
 *   Magnetic:     stroke=#cc7722 (orange), fill=white
 *   Signal/Control: stroke=#222, fill=white (signal wires are green)
 *   System:       stroke=#222, fill=white
 */

export interface TerminalOffset { x: number; y: number; }

export interface ComponentSymbol {
  svgBody: string;
  terminals: TerminalOffset[];
  label: string;
  width: number;
  height: number;
}

const T = 25; // standard terminal offset

// ── Domain colors ──
const EL = '#222222';     // electrical stroke
const TH = '#4488bb';     // thermal stroke
const MG = '#cc7722';     // magnetic stroke
const MC = '#7744aa';     // mechanical stroke
const SG = '#222222';     // signal/control stroke
const W = 'white';        // standard fill

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Helper: 2-terminal box (IEC style) ──
function box2(stroke: string, fill: string, label: string): ComponentSymbol {
  return {
    svgBody: `
      <line x1="-25" y1="0" x2="-15" y2="0" stroke="${stroke}" stroke-width="1.5"/>
      <rect x="-15" y="-6" width="30" height="12" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <text x="0" y="3.5" font-size="7" text-anchor="middle" fill="${stroke}" class="symbol-text">${escapeXml(label)}</text>
      <line x1="15" y1="0" x2="25" y2="0" stroke="${stroke}" stroke-width="1.5"/>
    `,
    terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }],
    label, width: 50, height: 16,
  };
}

// ── Helper: circle sensor ──
function circleSensor(stroke: string, letter: string): ComponentSymbol {
  return {
    svgBody: `
      <line x1="-25" y1="0" x2="-10" y2="0" stroke="${stroke}" stroke-width="1.5"/>
      <circle cx="0" cy="0" r="10" fill="${W}" stroke="${stroke}" stroke-width="1.5"/>
      <text x="0" y="4" font-size="10" text-anchor="middle" font-weight="bold" fill="${stroke}" class="symbol-text">${letter}</text>
      <line x1="10" y1="0" x2="25" y2="0" stroke="${stroke}" stroke-width="1.5"/>
    `,
    terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }, { x: 0, y: 10 }],
    label: letter, width: 50, height: 24,
  };
}

// ── Helper: circle source with + − ──
function circleSource(stroke: string, label?: string): ComponentSymbol {
  const inner = label
    ? `<text x="0" y="4" font-size="8" text-anchor="middle" fill="${stroke}" class="symbol-text">${escapeXml(label)}</text>`
    : `<text x="5" y="4" font-size="10" text-anchor="middle" font-weight="bold" fill="${stroke}" class="symbol-text">+</text>
       <text x="-5" y="4" font-size="10" text-anchor="middle" font-weight="bold" fill="${stroke}" class="symbol-text">−</text>`;
  return {
    svgBody: `
      <line x1="-25" y1="0" x2="-12" y2="0" stroke="${stroke}" stroke-width="1.5"/>
      <circle cx="0" cy="0" r="12" fill="${W}" stroke="${stroke}" stroke-width="1.5"/>
      ${inner}
      <line x1="12" y1="0" x2="25" y2="0" stroke="${stroke}" stroke-width="1.5"/>
    `,
    terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }],
    label: label || 'V', width: 50, height: 28,
  };
}

// ── Helper: signal block (rectangle with label, input left, output right) ──
function signalBlock(label: string, inputs: number = 1, outputs: number = 1): ComponentSymbol {
  const terms: TerminalOffset[] = [];
  for (let i = 0; i < inputs; i++) {
    const y = inputs === 1 ? 0 : -10 + (20 * i) / (inputs - 1);
    terms.push({ x: -T, y });
  }
  for (let i = 0; i < outputs; i++) {
    const y = outputs === 1 ? 0 : -10 + (20 * i) / (outputs - 1);
    terms.push({ x: T, y });
  }
  return {
    svgBody: `
      <rect x="-18" y="-12" width="36" height="24" rx="2" fill="${W}" stroke="${SG}" stroke-width="1.5"/>
      <text x="0" y="4" font-size="7" text-anchor="middle" fill="${SG}" class="symbol-text">${escapeXml(label)}</text>
    `,
    terminals: terms, label, width: 40, height: 28,
  };
}

// ── Helper: source block (only output) ──
function sourceBlock(label: string, icon?: string): ComponentSymbol {
  return {
    svgBody: `
      <rect x="-15" y="-12" width="30" height="24" rx="2" fill="${W}" stroke="${SG}" stroke-width="1.5"/>
      ${icon || `<text x="0" y="4" font-size="7" text-anchor="middle" fill="${SG}" class="symbol-text">${escapeXml(label)}</text>`}
    `,
    terminals: [{ x: T, y: 0 }],
    label, width: 34, height: 28,
  };
}

// ── Helper: 3-terminal switch (vertical, drain top, source bottom, gate left) ──
function switch3Terminal(stroke: string, label: string, hasGateDiode: boolean = false): ComponentSymbol {
  const diodeSvg = hasGateDiode
    ? `<polygon points="-2,2 2,2 0,-2" fill="${stroke}" stroke="${stroke}" stroke-width="0.5"/>
       <line x1="-2" y1="-2" x2="2" y2="-2" stroke="${stroke}" stroke-width="1"/>`
    : '';
  return {
    svgBody: `
      <line x1="0" y1="-25" x2="0" y2="-8" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="0" y1="-8" x2="8" y2="-8" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="8" y1="-12" x2="8" y2="12" stroke="${stroke}" stroke-width="2"/>
      <line x1="12" y1="-10" x2="12" y2="-4" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="12" y1="-1" x2="12" y2="5" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="12" y1="6" x2="12" y2="12" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="12" y1="-7" x2="0" y2="-7" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="12" y1="9" x2="0" y2="9" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="0" y1="9" x2="0" y2="25" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="-25" y1="0" x2="8" y2="0" stroke="${stroke}" stroke-width="1.5"/>
      <polygon points="4,9 8,5 8,13" fill="${stroke}" stroke="none"/>
      ${diodeSvg}
    `,
    terminals: [
      { x: 0, y: -T },  // drain/collector
      { x: 0, y: T },   // source/emitter
      { x: -T, y: 0 },  // gate
    ],
    label, width: 40, height: 50,
  };
}

// ── Helper: domain-colored generic ──
function domainGeneric(stroke: string, label: string): ComponentSymbol {
  return {
    svgBody: `
      <rect x="-18" y="-12" width="36" height="24" rx="2" fill="${W}" stroke="${stroke}" stroke-width="1.5"/>
      <text x="0" y="4" font-size="7" text-anchor="middle" fill="${stroke}" class="symbol-text">${escapeXml(label)}</text>
    `,
    terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }],
    label, width: 40, height: 28,
  };
}

// ── Helper: ground symbol ──
function groundSymbol(stroke: string): ComponentSymbol {
  return {
    svgBody: `
      <line x1="0" y1="-25" x2="0" y2="0" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="-10" y1="0" x2="10" y2="0" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="-6" y1="4" x2="6" y2="4" stroke="${stroke}" stroke-width="1.5"/>
      <line x1="-3" y1="8" x2="3" y2="8" stroke="${stroke}" stroke-width="1.5"/>
    `,
    terminals: [{ x: 0, y: -T }],
    label: 'GND', width: 24, height: 36,
  };
}

// ════════════════════════════════════════════
// ELECTRICAL COMPONENTS (black / white)
// ════════════════════════════════════════════

const elResistor = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-15" y2="0" stroke="${EL}" stroke-width="1.5"/>
    <rect x="-15" y="-6" width="30" height="12" fill="${W}" stroke="${EL}" stroke-width="1.5"/>
    <line x1="15" y1="0" x2="25" y2="0" stroke="${EL}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'R', width: 50, height: 16,
});

const elCapacitor = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-4" y2="0" stroke="${EL}" stroke-width="1.5"/>
    <rect x="-4" y="-10" width="8" height="20" fill="${W}" stroke="none"/>
    <line x1="-4" y1="-10" x2="-4" y2="10" stroke="${EL}" stroke-width="2"/>
    <line x1="4" y1="-10" x2="4" y2="10" stroke="${EL}" stroke-width="2"/>
    <line x1="4" y1="0" x2="25" y2="0" stroke="${EL}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'C', width: 50, height: 24,
});

const elInductor = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-15" y2="0" stroke="${EL}" stroke-width="1.5"/>
    <rect x="-15" y="-6" width="30" height="12" fill="${EL}" stroke="${EL}" stroke-width="1.5"/>
    <line x1="15" y1="0" x2="25" y2="0" stroke="${EL}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'L', width: 50, height: 16,
});

const elDiode = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-8" y2="0" stroke="${EL}" stroke-width="1.5"/>
    <polygon points="-8,-8 -8,8 8,0" fill="${EL}" stroke="${EL}" stroke-width="1.5"/>
    <line x1="8" y1="-8" x2="8" y2="8" stroke="${EL}" stroke-width="2"/>
    <line x1="8" y1="0" x2="25" y2="0" stroke="${EL}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'D', width: 50, height: 20,
});

const elThyristor = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-8" y2="0" stroke="${EL}" stroke-width="1.5"/>
    <polygon points="-8,-8 -8,8 8,0" fill="${EL}" stroke="${EL}" stroke-width="1.5"/>
    <line x1="8" y1="-8" x2="8" y2="8" stroke="${EL}" stroke-width="2"/>
    <line x1="8" y1="0" x2="25" y2="0" stroke="${EL}" stroke-width="1.5"/>
    <line x1="8" y1="8" x2="14" y2="14" stroke="${EL}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }, { x: 14, y: 14 }],
  label: 'SCR', width: 50, height: 30,
});

const elMosfet = (): ComponentSymbol => switch3Terminal(EL, 'M');
const elMosfetWithDiode = (): ComponentSymbol => switch3Terminal(EL, 'M', true);
const elIgbt = (): ComponentSymbol => switch3Terminal(EL, 'IGBT');
const elIgbtWithDiode = (): ComponentSymbol => switch3Terminal(EL, 'IGBT', true);

const elTransformer = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="-8" x2="-10" y2="-8" stroke="${EL}" stroke-width="1.5"/>
    <line x1="-25" y1="8" x2="-10" y2="8" stroke="${EL}" stroke-width="1.5"/>
    <rect x="-10" y="-14" width="8" height="28" fill="${EL}" stroke="${EL}" stroke-width="1"/>
    <line x1="-1" y1="-14" x2="-1" y2="14" stroke="${EL}" stroke-width="1"/>
    <line x1="1" y1="-14" x2="1" y2="14" stroke="${EL}" stroke-width="1"/>
    <rect x="2" y="-14" width="8" height="28" fill="${EL}" stroke="${EL}" stroke-width="1"/>
    <line x1="10" y1="-8" x2="25" y2="-8" stroke="${EL}" stroke-width="1.5"/>
    <line x1="10" y1="8" x2="25" y2="8" stroke="${EL}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: -8 }, { x: -T, y: 8 }, { x: T, y: -8 }, { x: T, y: 8 }],
  label: 'Xfmr', width: 50, height: 32,
});

const elSwitch = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-8" y2="0" stroke="${EL}" stroke-width="1.5"/>
    <line x1="-8" y1="0" x2="8" y2="-8" stroke="${EL}" stroke-width="1.5"/>
    <circle cx="-8" cy="0" r="2" fill="${W}" stroke="${EL}" stroke-width="1"/>
    <circle cx="8" cy="0" r="2" fill="${W}" stroke="${EL}" stroke-width="1"/>
    <line x1="8" y1="0" x2="25" y2="0" stroke="${EL}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }, { x: 0, y: -T }],
  label: 'SW', width: 50, height: 20,
});

// ════════════════════════════════════════════
// THERMAL COMPONENTS (pale blue / white)
// ════════════════════════════════════════════

const thResistor = (): ComponentSymbol => box2(TH, W, 'Rth');
const thCapacitor = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-4" y2="0" stroke="${TH}" stroke-width="1.5"/>
    <rect x="-4" y="-10" width="8" height="20" fill="${W}" stroke="none"/>
    <line x1="-4" y1="-10" x2="-4" y2="10" stroke="${TH}" stroke-width="2"/>
    <line x1="4" y1="-10" x2="4" y2="10" stroke="${TH}" stroke-width="2"/>
    <line x1="4" y1="0" x2="25" y2="0" stroke="${TH}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'Cth', width: 50, height: 24,
});
const thThermometer = (): ComponentSymbol => circleSensor(TH, 'T');
const thGround = (): ComponentSymbol => groundSymbol(TH);
const thSource = (label: string): ComponentSymbol => circleSource(TH, label);

// ════════════════════════════════════════════
// MAGNETIC COMPONENTS (orange / white)
// ════════════════════════════════════════════

const mgResistance = (): ComponentSymbol => box2(MG, W, 'Rm');
const mgPermeance = (): ComponentSymbol => box2(MG, W, 'Pm');
const mgMmfSource = (label: string): ComponentSymbol => circleSource(MG, label);
const mgSensor = (letter: string): ComponentSymbol => circleSensor(MG, letter);

// ════════════════════════════════════════════
// MECHANICAL COMPONENTS (purple / white)
// ════════════════════════════════════════════

const mcDamper = (label: string): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-10" y2="0" stroke="${MC}" stroke-width="1.5"/>
    <rect x="-10" y="-8" width="6" height="16" fill="${W}" stroke="${MC}" stroke-width="1.5"/>
    <line x1="-4" y1="-6" x2="-4" y2="6" stroke="${MC}" stroke-width="1"/>
    <line x1="-4" y1="6" x2="6" y2="6" stroke="${MC}" stroke-width="1"/>
    <line x1="-4" y1="-6" x2="6" y2="-6" stroke="${MC}" stroke-width="1"/>
    <line x1="6" y1="0" x2="25" y2="0" stroke="${MC}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label, width: 50, height: 20,
});

const mcSpring = (label: string): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-14" y2="0" stroke="${MC}" stroke-width="1.5"/>
    <polyline points="-14,0 -10,-6 -4,6 2,-6 8,6 14,0" fill="none" stroke="${MC}" stroke-width="1.5"/>
    <line x1="14" y1="0" x2="25" y2="0" stroke="${MC}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label, width: 50, height: 16,
});

const mcInertia = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-12" y2="0" stroke="${MC}" stroke-width="1.5"/>
    <rect x="-12" y="-10" width="24" height="20" fill="${W}" stroke="${MC}" stroke-width="1.5"/>
    <text x="0" y="4" font-size="8" text-anchor="middle" fill="${MC}" class="symbol-text">J</text>
    <line x1="12" y1="0" x2="25" y2="0" stroke="${MC}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'J', width: 50, height: 24,
});

const mcMass = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-12" y2="0" stroke="${MC}" stroke-width="1.5"/>
    <rect x="-12" y="-10" width="24" height="20" fill="${W}" stroke="${MC}" stroke-width="1.5"/>
    <text x="0" y="4" font-size="8" text-anchor="middle" fill="${MC}" class="symbol-text">m</text>
    <line x1="12" y1="0" x2="25" y2="0" stroke="${MC}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'm', width: 50, height: 24,
});

const mcGear = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-10" y2="0" stroke="${MC}" stroke-width="1.5"/>
    <circle cx="-5" cy="0" r="8" fill="${W}" stroke="${MC}" stroke-width="1.5"/>
    <circle cx="5" cy="0" r="6" fill="${W}" stroke="${MC}" stroke-width="1.5"/>
    <line x1="11" y1="0" x2="25" y2="0" stroke="${MC}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'Gear', width: 50, height: 20,
});

const mcSensor = (letter: string): ComponentSymbol => circleSensor(MC, letter);
const mcSource = (label: string): ComponentSymbol => circleSource(MC, label);

// ════════════════════════════════════════════
// SIGNAL/CONTROL COMPONENTS
// ════════════════════════════════════════════

const sgGoto = (tag: string): ComponentSymbol => {
  const tw = Math.max(18, tag.length * 5 + 8);
  const hw = tw / 2;
  return {
    svgBody: `
      <polygon points="${-hw},-7 ${hw - 6},-7 ${hw},0 ${hw - 6},7 ${-hw},7" fill="${W}" stroke="${SG}" stroke-width="1.2"/>
      <text x="-3" y="3" font-size="7" text-anchor="middle" fill="${SG}" class="symbol-text">${escapeXml(tag)}</text>
    `,
    terminals: [{ x: -hw, y: 0 }], label: tag, width: tw, height: 14,
  };
};

const sgFrom = (tag: string): ComponentSymbol => {
  const tw = Math.max(18, tag.length * 5 + 8);
  const hw = tw / 2;
  return {
    svgBody: `
      <polygon points="${-hw},0 ${-hw + 6},-7 ${hw},-7 ${hw},7 ${-hw + 6},7" fill="${W}" stroke="${SG}" stroke-width="1.2"/>
      <text x="3" y="3" font-size="7" text-anchor="middle" fill="${SG}" class="symbol-text">${escapeXml(tag)}</text>
    `,
    terminals: [{ x: -hw, y: 0 }], label: tag, width: tw, height: 14,
  };
};

const sgSum = (): ComponentSymbol => ({
  svgBody: `
    <circle cx="0" cy="0" r="10" fill="${W}" stroke="${SG}" stroke-width="1.5"/>
    <line x1="-6" y1="0" x2="6" y2="0" stroke="${SG}" stroke-width="1"/>
    <line x1="0" y1="-6" x2="0" y2="6" stroke="${SG}" stroke-width="1"/>
    <line x1="-25" y1="0" x2="-10" y2="0" stroke="${SG}" stroke-width="1.5"/>
    <line x1="10" y1="0" x2="25" y2="0" stroke="${SG}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'Sum', width: 50, height: 24,
});

const sgGain = (): ComponentSymbol => ({
  svgBody: `
    <line x1="-25" y1="0" x2="-12" y2="0" stroke="${SG}" stroke-width="1.5"/>
    <polygon points="-12,-10 -12,10 12,0" fill="${W}" stroke="${SG}" stroke-width="1.5"/>
    <line x1="12" y1="0" x2="25" y2="0" stroke="${SG}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'K', width: 50, height: 24,
});

const sgProduct = (): ComponentSymbol => ({
  svgBody: `
    <circle cx="0" cy="0" r="10" fill="${W}" stroke="${SG}" stroke-width="1.5"/>
    <text x="0" y="5" font-size="12" text-anchor="middle" fill="${SG}" class="symbol-text">×</text>
    <line x1="-25" y1="0" x2="-10" y2="0" stroke="${SG}" stroke-width="1.5"/>
    <line x1="10" y1="0" x2="25" y2="0" stroke="${SG}" stroke-width="1.5"/>
  `,
  terminals: [{ x: -T, y: 0 }, { x: T, y: 0 }], label: 'Prod', width: 50, height: 24,
});

const sgIntegrator = (): ComponentSymbol => signalBlock('1/s');

const sgScope = (): ComponentSymbol => ({
  svgBody: `
    <rect x="-17" y="-14" width="34" height="28" rx="3" fill="${W}" stroke="${SG}" stroke-width="1.5"/>
    <rect x="-13" y="-10" width="26" height="20" rx="1" fill="#f0f0f0" stroke="${SG}" stroke-width="0.8"/>
    <line x1="-13" y1="2" x2="13" y2="2" stroke="#ccc" stroke-width="0.4"/>
    <line x1="0" y1="-10" x2="0" y2="10" stroke="#ccc" stroke-width="0.4"/>
    <polyline points="-10,2 -6,2 -4,-6 0,6 3,-4 6,2 10,2" fill="none" stroke="#22aa44" stroke-width="1.2"/>
    <circle cx="14" cy="11" r="1.5" fill="none" stroke="${SG}" stroke-width="0.8"/>
  `,
  terminals: [{ x: -8, y: -14 }, { x: 8, y: -14 }],
  label: 'Scope', width: 38, height: 32,
});

const sgPulseGen = (): ComponentSymbol => sourceBlock('PWM',
  `<polyline points="-8,4 -8,-4 -2,-4 -2,4 4,4 4,-4 10,-4" fill="none" stroke="${SG}" stroke-width="1.2"/>`
);

const sgSubsystem = (name: string): ComponentSymbol => ({
  svgBody: `
    <rect x="-30" y="-20" width="60" height="40" fill="${W}" stroke="${SG}" stroke-width="1.5"/>
    <rect x="-27" y="-17" width="54" height="34" fill="none" stroke="${SG}" stroke-width="0.5"/>
    <text x="0" y="4" font-size="8" text-anchor="middle" fill="${SG}" class="symbol-text">${escapeXml(name)}</text>
  `,
  terminals: [{ x: -30, y: 0 }, { x: 30, y: 0 }, { x: 0, y: -20 }, { x: 0, y: 20 }],
  label: name, width: 64, height: 44,
});

// ════════════════════════════════════════════
// MASTER SYMBOL MAP
// ════════════════════════════════════════════

/** Maps component type → domain category for coloring */
const domainMap: Record<string, string> = {};

// Electrical
const electricalTypes = [
  'Resistor', 'Capacitor', 'Inductor', 'Diode', 'Mosfet', 'MosfetWithDiode',
  'Igbt', 'IgbtWithDiode', 'Igct', 'IgctReverseConducting', 'Gto', 'GtoReverseConducting',
  'Thyristor', 'Triac', 'Switch', 'Switch2', 'Switch3', 'BasicSwitch', 'Breaker',
  'ManualSwitch', 'ManualSwitch2', 'ManualSwitch3',
  'DCVoltageSource', 'ACVoltageSource', 'VoltageSource', 'CurrentSource', 'DCCurrentSource', 'ACCurrentSource',
  'ThreePhaseVoltageSource',
  'Resistor', 'PiecewiseLinearResistor', 'VarResistorConstCapacitor', 'VarResistorConstInductor',
  'VarResistorVarCapacitor', 'VarResistorVarInductor', 'VarCapacitor', 'VarInductor',
  'SatCapacitor', 'SatInductor', 'MutInductor',
  'Voltmeter', 'Ammeter', 'ThreePhaseMeter',
  'Transformer', 'PiSectionLine', 'Ground',
  'ElectricalModelSettings', 'ElectricalAlgebraicComponent', 'MagneticInterface',
  'SmallSignalPerturbation', 'SmallSignalResponse', 'Port',
];
for (const t of electricalTypes) domainMap[t] = 'electrical';

// Thermal
const thermalTypes = [
  'ThermalResistor', 'ThermalCapacitor', 'ThermalCapacitorGnd', 'ThermalGround',
  'ConstantTemperature', 'ConstantTemperatureGnd', 'ControlledTemperature', 'ControlledTemperatureGnd',
  'ConstantHeatFlow', 'ControlledHeatFlow',
  'Thermometer', 'ThermometerGnd', 'HeatFlowMeter',
  'HeatSink', 'ThermalChain', 'ThermalPackageImpedance',
  'ThermalMux', 'ThermalSelector', 'ThermalModelSettings', 'AmbientTemperature', 'HeatPort',
];
for (const t of thermalTypes) domainMap[t] = 'thermal';

// Magnetic
const magneticTypes = [
  'MagneticResistance', 'MagneticPermeance', 'MagneticVarPermeance',
  'ConstantMmf', 'ControlledMmf', 'MmfMeter', 'FluxRateMeter',
  'MagneticMux', 'MagneticSelector', 'MagneticModelSettings', 'MagneticPort',
];
for (const t of magneticTypes) domainMap[t] = 'magnetic';

// Mechanical
const mechanicalTypes = [
  'Mass', 'TranslationalDamper', 'TranslationalSpring', 'TranslationalFriction',
  'TranslationalBacklash', 'TranslationalClutch', 'TranslationalHardStop', 'TranslationalControlledFriction',
  'TranslationalReference', 'TranslationalAlgebraicComponent', 'TranslationalModelSettings',
  'TranslationalMux', 'TranslationalSelector', 'TranslationalPort',
  'ForceSensor', 'PositionSensor', 'TranslationalSpeedSensor',
  'ConstantForce', 'ConstantTranslationalSpeed', 'ControlledForce', 'ControlledTranslationalSpeed',
  'Inertia', 'Gear', 'RotationalDamper', 'RotationalSpring', 'RotationalFriction',
  'RotationalBacklash', 'RotationalClutch', 'RotationalHardStop', 'RotationalControlledFriction',
  'RotationalReference', 'RotationalAlgebraicComponent', 'RotationalModelSettings',
  'RotationalMux', 'RotationalSelector', 'RotationalPort',
  'TorqueSensor', 'AngleSensor', 'RotationalSpeedSensor',
  'ConstantTorque', 'ConstantRotationalSpeed', 'ControlledTorque', 'ControlledRotationalSpeed',
];
for (const t of mechanicalTypes) domainMap[t] = 'mechanical';

export function getDomainColor(type: string): string {
  switch (domainMap[type]) {
    case 'electrical': return EL;
    case 'thermal': return TH;
    case 'magnetic': return MG;
    case 'mechanical': return MC;
    default: return SG;
  }
}

// Static symbol map (no dynamic args needed)
const symbolMap: Record<string, () => ComponentSymbol> = {
  // ── Electrical passive ──
  Resistor: elResistor,
  PiecewiseLinearResistor: () => box2(EL, W, 'Rpw'),
  VarResistorConstCapacitor: () => box2(EL, W, 'RC'),
  VarResistorConstInductor: () => box2(EL, W, 'RL'),
  VarResistorVarCapacitor: () => box2(EL, W, 'RC~'),
  VarResistorVarInductor: () => box2(EL, W, 'RL~'),
  VarCapacitor: () => box2(EL, W, 'C~'),
  VarInductor: () => box2(EL, W, 'L~'),
  SatCapacitor: () => box2(EL, W, 'Csat'),
  SatInductor: () => box2(EL, W, 'Lsat'),
  MutInductor: () => box2(EL, W, 'Mut'),
  Capacitor: elCapacitor,
  Inductor: elInductor,

  // ── Electrical switches/semiconductors ──
  Diode: elDiode,
  Thyristor: elThyristor,
  Triac: elThyristor,
  Mosfet: elMosfet,
  MosfetWithDiode: elMosfetWithDiode,
  Igbt: elIgbt,
  IgbtWithDiode: elIgbtWithDiode,
  Igct: () => switch3Terminal(EL, 'IGCT'),
  IgctReverseConducting: () => switch3Terminal(EL, 'IGCT', true),
  Gto: () => switch3Terminal(EL, 'GTO'),
  GtoReverseConducting: () => switch3Terminal(EL, 'GTO', true),
  Switch: elSwitch,
  Switch2: elSwitch,
  Switch3: elSwitch,
  BasicSwitch: elSwitch,
  Breaker: elSwitch,
  ManualSwitch: elSwitch,
  ManualSwitch2: elSwitch,
  ManualSwitch3: elSwitch,

  // ── Electrical sources ──
  DCVoltageSource: () => circleSource(EL),
  ACVoltageSource: () => circleSource(EL, '~'),
  VoltageSource: () => circleSource(EL),
  CurrentSource: () => circleSource(EL, 'I'),
  DCCurrentSource: () => circleSource(EL, 'I'),
  ACCurrentSource: () => circleSource(EL, 'I~'),
  ThreePhaseVoltageSource: () => circleSource(EL, '3~'),

  // ── Electrical measurement ──
  Ammeter: () => circleSensor(EL, 'A'),
  Voltmeter: () => circleSensor(EL, 'V'),
  ThreePhaseMeter: () => circleSensor(EL, '3φ'),

  // ── Electrical misc ──
  Transformer: elTransformer,
  PiSectionLine: () => box2(EL, W, 'π'),
  Ground: () => groundSymbol(EL),
  Port: () => domainGeneric(EL, 'Port'),
  ElectricalModelSettings: () => domainGeneric(EL, 'Set'),
  ElectricalAlgebraicComponent: () => domainGeneric(EL, 'Alg'),
  MagneticInterface: () => domainGeneric(MG, 'MagIF'),
  SmallSignalPerturbation: () => signalBlock('SSP'),
  SmallSignalResponse: () => signalBlock('SSR'),

  // ── Thermal ──
  ThermalResistor: thResistor,
  ThermalCapacitor: thCapacitor,
  ThermalCapacitorGnd: thCapacitor,
  ThermalGround: thGround,
  ThermalChain: () => box2(TH, W, 'Chain'),
  ThermalPackageImpedance: () => box2(TH, W, 'Zpkg'),
  ThermalMux: () => domainGeneric(TH, 'Mux'),
  ThermalSelector: () => domainGeneric(TH, 'Sel'),
  ThermalModelSettings: () => domainGeneric(TH, 'Set'),
  ConstantTemperature: () => thSource('T'),
  ConstantTemperatureGnd: () => thSource('T'),
  ControlledTemperature: () => thSource('T'),
  ControlledTemperatureGnd: () => thSource('T'),
  ConstantHeatFlow: () => thSource('Q'),
  ControlledHeatFlow: () => thSource('Q'),
  Thermometer: () => thThermometer(),
  ThermometerGnd: () => thThermometer(),
  HeatFlowMeter: () => circleSensor(TH, 'Q'),
  AmbientTemperature: () => thSource('Ta'),
  HeatSink: () => domainGeneric(TH, 'Sink'),
  HeatPort: () => domainGeneric(TH, 'HP'),

  // ── Magnetic ──
  MagneticResistance: mgResistance,
  MagneticPermeance: mgPermeance,
  MagneticVarPermeance: () => box2(MG, W, 'Pm~'),
  ConstantMmf: () => mgMmfSource('F'),
  ControlledMmf: () => mgMmfSource('F'),
  MmfMeter: () => mgSensor('F'),
  FluxRateMeter: () => mgSensor('dΦ'),
  MagneticMux: () => domainGeneric(MG, 'Mux'),
  MagneticSelector: () => domainGeneric(MG, 'Sel'),
  MagneticModelSettings: () => domainGeneric(MG, 'Set'),
  MagneticPort: () => domainGeneric(MG, 'MP'),

  // ── Mechanical translational ──
  Mass: mcMass,
  TranslationalDamper: () => mcDamper('b'),
  TranslationalSpring: () => mcSpring('k'),
  TranslationalFriction: () => domainGeneric(MC, 'Fric'),
  TranslationalBacklash: () => domainGeneric(MC, 'Blsh'),
  TranslationalClutch: () => domainGeneric(MC, 'Cltch'),
  TranslationalHardStop: () => domainGeneric(MC, 'Stop'),
  TranslationalControlledFriction: () => domainGeneric(MC, 'CFric'),
  TranslationalReference: () => groundSymbol(MC),
  TranslationalAlgebraicComponent: () => domainGeneric(MC, 'Alg'),
  TranslationalModelSettings: () => domainGeneric(MC, 'Set'),
  TranslationalMux: () => domainGeneric(MC, 'Mux'),
  TranslationalSelector: () => domainGeneric(MC, 'Sel'),
  TranslationalPort: () => domainGeneric(MC, 'TP'),
  ForceSensor: () => mcSensor('F'),
  PositionSensor: () => mcSensor('x'),
  TranslationalSpeedSensor: () => mcSensor('v'),
  ConstantForce: () => mcSource('F'),
  ConstantTranslationalSpeed: () => mcSource('v'),
  ControlledForce: () => mcSource('F'),
  ControlledTranslationalSpeed: () => mcSource('v'),

  // ── Mechanical rotational ──
  Inertia: mcInertia,
  Gear: mcGear,
  RotationalDamper: () => mcDamper('b'),
  RotationalSpring: () => mcSpring('k'),
  RotationalFriction: () => domainGeneric(MC, 'Fric'),
  RotationalBacklash: () => domainGeneric(MC, 'Blsh'),
  RotationalClutch: () => domainGeneric(MC, 'Cltch'),
  RotationalHardStop: () => domainGeneric(MC, 'Stop'),
  RotationalControlledFriction: () => domainGeneric(MC, 'CFric'),
  RotationalReference: () => groundSymbol(MC),
  RotationalAlgebraicComponent: () => domainGeneric(MC, 'Alg'),
  RotationalModelSettings: () => domainGeneric(MC, 'Set'),
  RotationalMux: () => domainGeneric(MC, 'Mux'),
  RotationalSelector: () => domainGeneric(MC, 'Sel'),
  RotationalPort: () => domainGeneric(MC, 'RP'),
  TorqueSensor: () => mcSensor('τ'),
  AngleSensor: () => mcSensor('θ'),
  RotationalSpeedSensor: () => mcSensor('ω'),
  ConstantTorque: () => mcSource('τ'),
  ConstantRotationalSpeed: () => mcSource('ω'),
  ControlledTorque: () => mcSource('τ'),
  ControlledRotationalSpeed: () => mcSource('ω'),

  // ── Signal / Control ──
  Scope: sgScope,
  XYPlot: () => signalBlock('XY'),
  Display: () => signalBlock('Disp'),
  PlecsProbe: () => signalBlock('Probe'),
  SwitchLossCalculator: () => signalBlock('SLC'),
  SignalMux: () => signalBlock('Mux'),
  SignalDemux: () => signalBlock('Demux'),
  SignalSelector: () => signalBlock('Sel'),
  DynamicSignalSelector: () => signalBlock('DSel'),
  ScalarExpander: () => signalBlock('Expand'),
  ConfigurableSubsystem: () => signalBlock('Cfg'),
  ModelReference: () => signalBlock('Model'),
  Input: () => signalBlock('In'),
  Output: () => signalBlock('Out'),
  ToFile: () => signalBlock('ToFile'),
  FromFile: () => signalBlock('FrFile'),
  PauseStop: () => signalBlock('Stop'),
  TaskFrame: () => signalBlock('Task'),
  TaskTransition: () => signalBlock('TaskT'),
  Label: () => signalBlock('Label'),
  WireMux: () => signalBlock('WMux'),
  WireSelector: () => signalBlock('WSel'),
  Ethercat: () => signalBlock('ECAT'),
  CanPack: () => signalBlock('CAN↑'),
  CanUnpack: () => signalBlock('CAN↓'),

  // Control sources
  Constant: () => sourceBlock('C'),
  InitialCondition: () => sourceBlock('IC'),
  Clock: () => sourceBlock('t'),
  Step: () => sourceBlock('Step'),
  PulseGenerator: sgPulseGen,
  SineGenerator: () => sourceBlock('Sin', `<path d="M -8,0 C -4,-8 0,-8 4,0 C 8,8 12,8 12,0" fill="none" stroke="${SG}" stroke-width="1.2"/>`),
  TriangleGenerator: () => sourceBlock('Tri', `<polyline points="-8,4 -4,-4 0,4 4,-4 8,4" fill="none" stroke="${SG}" stroke-width="1.2"/>`),

  // Control math
  Gain: sgGain,
  Offset: () => signalBlock('+K'),
  Sum: sgSum,
  Product: sgProduct,
  Abs: () => signalBlock('|u|'),
  Signum: () => signalBlock('sgn'),
  Trigonometry: () => signalBlock('trig'),
  Math: () => signalBlock('math'),
  Rounding: () => signalBlock('rnd'),
  MinMax: () => signalBlock('m/M'),
  AlgebraicConstraint: () => signalBlock('f=0'),
  DataType: () => signalBlock('Type'),

  // Control continuous
  Integrator: sgIntegrator,
  TransferFunction: () => signalBlock('TF'),
  StateSpace: () => signalBlock('SS'),

  // Control discrete
  Delay: () => signalBlock('z⁻¹'),
  DiscreteIntegrator: () => signalBlock('Ts·z'),
  DiscreteTransferFunction: () => signalBlock('DTF'),
  DiscreteStateSpace: () => signalBlock('DSS'),
  ZeroOrderHold: () => signalBlock('ZOH'),
  DiscreteMean: () => signalBlock('Mean'),
  Memory: () => signalBlock('Mem'),

  // Control discontinuous
  Saturation: () => signalBlock('Sat'),
  Relay: () => signalBlock('Relay'),
  SignalSwitch: () => signalBlock('SW'),
  ManualSignalSwitch: () => signalBlock('MSW'),
  MultiportSignalSwitch: () => signalBlock('MPsw'),
  HitCrossing: () => signalBlock('Hit'),
  Comparator: () => signalBlock('<>'),
  RateLimiter: () => signalBlock('Rate'),

  // Control logical
  RelationalOperator: () => signalBlock('≥≤'),
  ConstantRelationalOperator: () => signalBlock('≥K'),
  LogicalOperator: () => signalBlock('AND'),
  CombinatorialLogic: () => signalBlock('Logic'),
  EdgeDetection: () => signalBlock('Edge'),
  Monoflop: () => signalBlock('Mono'),
  FsmBlock: () => signalBlock('FSM'),

  // Control functions/tables
  Function: () => signalBlock('f(u)'),
  CScript: () => signalBlock('C'),
  Dll: () => signalBlock('DLL'),
  Lookup1D: () => signalBlock('LUT'),
  Lookup3D: () => signalBlock('LUT3'),
  FourierSeries: () => signalBlock('Four'),
  PeriodicAverage: () => signalBlock('Avg'),

  // Assertion
  Assertion: () => signalBlock('Assert'),

  // Reference (generic library block)
  Reference: () => signalBlock('Ref'),
};

/**
 * Get the symbol for a component.
 * For Goto/From, pass the tag name. For Subsystem, pass the component name.
 */
export function getComponentSymbol(type: string, tagOrName?: string): ComponentSymbol {
  if (type === 'Goto') return sgGoto(tagOrName || '?');
  if (type === 'From') return sgFrom(tagOrName || '?');
  if (type === 'Subsystem') return sgSubsystem(tagOrName || 'Sub');
  const factory = symbolMap[type];
  if (factory) return factory();
  // Fallback: use domain color if known
  const domain = domainMap[type];
  if (domain) {
    const stroke = domain === 'electrical' ? EL : domain === 'thermal' ? TH : domain === 'magnetic' ? MG : domain === 'mechanical' ? MC : SG;
    return domainGeneric(stroke, type.substring(0, 6));
  }
  return domainGeneric(SG, type.length > 8 ? type.substring(0, 6) + '..' : type);
}

// ── Transform helpers ──

const VERTICAL_TYPES = new Set([
  'Mosfet', 'MosfetWithDiode', 'Igbt', 'IgbtWithDiode',
  'Igct', 'IgctReverseConducting', 'Gto', 'GtoReverseConducting',
]);

export function getComponentTransform(
  position: [number, number],
  direction: string,
  flipped: boolean,
  componentType: string,
): string {
  const [cx, cy] = position;
  let rotation = 0;
  const isVertical = VERTICAL_TYPES.has(componentType);

  if (isVertical) {
    switch (direction) {
      case 'up': rotation = 0; break;
      case 'right': rotation = 90; break;
      case 'down': rotation = 180; break;
      case 'left': rotation = 270; break;
    }
  } else {
    switch (direction) {
      case 'right': rotation = 0; break;
      case 'down': rotation = 90; break;
      case 'left': rotation = 180; break;
      case 'up': rotation = 270; break;
    }
  }

  let transform = `translate(${cx}, ${cy})`;
  if (rotation !== 0) transform += ` rotate(${rotation})`;
  if (flipped) {
    if (rotation === 0 || rotation === 180) transform += ' scale(1, -1)';
    else transform += ' scale(-1, 1)';
  }
  return transform;
}

export function getTerminalPosition(
  position: [number, number],
  direction: string,
  flipped: boolean,
  componentType: string,
  terminalIndex: number,
  tagOrName?: string,
): [number, number] {
  const symbol = getComponentSymbol(componentType, tagOrName);
  const termIdx = terminalIndex - 1;
  if (termIdx < 0 || termIdx >= symbol.terminals.length) return position;

  let { x, y } = symbol.terminals[termIdx];
  const isVertical = VERTICAL_TYPES.has(componentType);

  let rotation = 0;
  if (isVertical) {
    switch (direction) {
      case 'up': rotation = 0; break;
      case 'right': rotation = 90; break;
      case 'down': rotation = 180; break;
      case 'left': rotation = 270; break;
    }
  } else {
    switch (direction) {
      case 'right': rotation = 0; break;
      case 'down': rotation = 90; break;
      case 'left': rotation = 180; break;
      case 'up': rotation = 270; break;
    }
  }

  if (flipped) {
    if (rotation === 0 || rotation === 180) y = -y;
    else x = -x;
  }

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [position[0] + x * cos - y * sin, position[1] + x * sin + y * cos];
}
