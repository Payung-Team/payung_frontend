/**
 * ภาพประกอบหน้า Landing — PYG-687
 *
 * วาดเองเป็น SVG ทั้งหมด (ไม่ใช้รูปสต็อกหรือรูปที่ไม่รู้ที่มา) จึงไม่มีความเสี่ยงเรื่องลิขสิทธิ์
 * ฉากอิงจากรูปตัวอย่างที่ทีมเลือก (ท่าทาง เสื้อผ้า สถานที่) แต่วาดขึ้นใหม่ ไม่ได้ลอกลายเส้นจากรูป
 *
 * ตัวละครสร้างจากโครงกระดูกตามสัดส่วนคนจริง (สูงราว 7 เท่าของศีรษะ) แล้ววาดเป็นมุมข้าง:
 *   ไหล่ ศอก ข้อมือ สะโพก เข่า ข้อเท้า อยู่ตำแหน่งตามกายวิภาค ความยาวต้นแขน/ปลายแขน/ต้นขา/หน้าแข้งคงที่
 *   มือที่ต้องไปแตะของ (ราวจับ แขนอีกคน) ใช้ IK หาตำแหน่งศอกให้เอง แขนจึงงอตามธรรมชาติ
 * ระบบพิกัดภายในตัวละคร: u = ไปข้างหน้า (ทิศที่หันหน้า), v = ลง, จุดกำเนิดที่ข้อสะโพก
 */
import type { ReactNode } from 'react';

const C = {
  dark: '#005C3E',
  primary: '#009265',
  light: '#52B69A',
  pale: '#BFE0D6',
  orange: '#F4A340',
  orangeShade: '#DD8C2C',
  cream: '#FFE7C2',
  skin: '#F3CDB0',
  skinShade: '#E0B190',
  ink: '#2E3A35',
  lip: '#B0604C',
  blush: '#F09A8A',
  shoe: '#2E3A35',
  white: '#FFFFFF',
  metal: '#AEB8BF',
  metalDark: '#56616A',
  rubber: '#2F3438',
};

type Pt = [number, number];

const rad = (deg: number) => (deg * Math.PI) / 180;
/** ทิศจากมุม: 0° = ชี้ลง, มุมบวก = เอียงไปข้างหน้า */
const dir = (deg: number): Pt => [Math.sin(rad(deg)), Math.cos(rad(deg))];
const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** หมุนตามเข็มนาฬิกา (เหมือน SVG rotate) — มุมบวกทำให้ลำตัวโน้มไปข้างหน้า */
const rotate = ([u, v]: Pt, deg: number): Pt => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [u * c - v * s, u * s + v * c];
};
const pt = ([u, v]: Pt) => `${u.toFixed(2)},${v.toFixed(2)}`;

/** สัดส่วนร่างกาย หน่วยเป็น "ความสูงศีรษะ" (H) — คนทั้งตัวสูงราว 7H */
const BODY = {
  thigh: 1.5,
  shin: 1.65,
  ankle: 0.3,
  upperArm: 1.3,
  foreArm: 1.1,
  shoulder: [0.02, -2.12] as Pt,
  neck: [0.06, -2.42] as Pt,
  head: [0.12, -0.7] as Pt,
};

interface Look {
  top: string;
  topShade: string;
  bottom: string;
  bottomShade: string;
  hair: string;
  hairStyle: 'bun' | 'ponytail' | 'long' | 'bob' | 'short';
  skin?: string;
  skinShade?: string;
  /** สีถุงมือ — ไม่ใส่ = มือสีผิว */
  hands?: string;
  beard?: string;
  longSleeve?: boolean;
  glasses?: boolean;
  eyes?: 'smile' | 'open' | 'closed';
  mouth?: 'smile' | 'flat';
}

const SCRUBS = {
  royal: { top: '#2F6FD0', topShade: '#2659AD', bottom: '#2B63BC', bottomShade: '#2152A0' },
  sky: { top: '#93BDEB', topShade: '#79A6D8', bottom: '#86B1E2', bottomShade: '#6F9ACB' },
  lavender: { top: '#9DA3DE', topShade: '#848BCB', bottom: '#9097D6', bottomShade: '#7981C1' },
};

const LOOK = {
  /** ผู้ดูแล ชุดสครับน้ำเงิน ผมหางม้า */
  caregiver: { ...SCRUBS.royal, hair: '#2A2522', hairStyle: 'ponytail' } as Look,
  /** ผู้ดูแล ชุดสครับฟ้าอ่อน สวมถุงมือ */
  nurse: { ...SCRUBS.sky, hair: '#2A2522', hairStyle: 'bun', hands: '#3D7FD9' } as Look,
  /** นักกายภาพบำบัด ชุดสครับม่วงอ่อน */
  therapist: { ...SCRUBS.lavender, hair: '#2A2522', hairStyle: 'bun' } as Look,
  /** ผู้ดูแลผมยาว เสื้อแขนยาวฟ้า */
  escort: { ...SCRUBS.sky, hair: '#2A2522', hairStyle: 'long', longSleeve: true } as Look,
  /** คุณยาย เสื้อไหมพรมสีครีม ผมบ็อบ */
  grandma: {
    top: '#EFE4D2',
    topShade: '#DCCDB5',
    bottom: '#CFC6B8',
    bottomShade: '#BBB1A2',
    hair: '#5A4A42',
    hairStyle: 'bob',
    longSleeve: true,
  } as Look,
  /** ผู้รับบริการกายภาพฯ เสื้อยืดสีเบจ ผมสีดอกเลา */
  patientMan: {
    top: '#D3C6AF',
    topShade: '#BCAE95',
    bottom: '#5B5F63',
    bottomShade: '#4A4E52',
    hair: '#7C7F82',
    hairStyle: 'short',
    eyes: 'open',
    mouth: 'flat',
  } as Look,
  /** คุณตาผมขาว ไว้เครา เสื้อเชิ้ตฟ้า */
  grandpa: {
    top: '#B5D0EE',
    topShade: '#97B6DA',
    bottom: '#D8CBB0',
    bottomShade: '#C4B697',
    hair: '#F1F1EE',
    hairStyle: 'short',
    beard: '#ECECE8',
    skin: '#EDC3A2',
    skinShade: '#DAA985',
    longSleeve: true,
  } as Look,
};

interface ArmPose {
  /** ตำแหน่งข้อมือที่ต้องการ (พิกัดของฉาก) — คำนวณศอกให้เอง */
  target?: Pt;
  /** หรือกำหนดมุมเอง: [ต้นแขน, ปลายแขน] */
  angles?: [number, number];
  /** 1 = ศอกอยู่ด้านล่าง (ปกติ), -1 = ศอกยกขึ้น */
  bend?: 1 | -1;
}

interface FigureProps {
  /** ตำแหน่งข้อสะโพกในแนวนอน */
  x: number;
  /** ระดับพื้น — ใช้คำนวณความสูงสะโพกจากความยาวขา */
  floor: number;
  /** ระบุตรง ๆ เมื่อไม่ได้ยืน/นั่งบนพื้น */
  hipY?: number;
  facing: 1 | -1;
  H?: number;
  pose?: 'stand' | 'sit';
  /** มุมขา [ต้นขา, หน้าแข้ง] ของขาข้างใกล้และข้างไกล */
  legs?: { near: [number, number]; far: [number, number] };
  lean?: number;
  headTilt?: number;
  near?: ArmPose;
  far?: ArmPose;
  look: Look;
  /** วาดที่มือข้างใกล้ (พิกัดภายในตัวละคร) เช่น ดัมเบล ผ้า */
  nearItem?: (hand: Pt) => ReactNode;
  /** วาดในพิกัดของฉาก ระหว่างลำตัวกับแขนข้างใกล้ เช่น เตียง/คนไข้ที่มืออยู่บนนั้น */
  underNearArm?: ReactNode;
  /** วาดแขนข้างไกลทับของใน underNearArm ด้วย (เช่น ก้มลงใช้สองมือทำงานบนเตียง) */
  farOverUnder?: boolean;
}

/** ศีรษะมุมข้าง หันไปทาง +x — หน่วย H, จุดศูนย์กลางที่ (0,0) */
function Head({ look, H }: { look: Look; H: number }) {
  const skin = look.skin ?? C.skin;
  const skinShade = look.skinShade ?? C.skinShade;
  const style = look.hairStyle;
  const eyes = look.eyes ?? 'smile';
  return (
    <g transform={`scale(${H})`}>
      {style === 'ponytail' && (
        <path d="M-0.34,-0.32 C-0.74,-0.24 -0.82,0.3 -0.64,0.78 C-0.56,0.42 -0.5,0.08 -0.28,-0.08 Z" fill={look.hair} />
      )}
      {style === 'long' && (
        <path d="M-0.44,-0.28 C-0.68,0.18 -0.64,0.72 -0.5,1.02 L-0.04,0.94 C-0.12,0.62 -0.1,0.3 0,0.08 Z" fill={look.hair} />
      )}
      <ellipse cx={-0.06} cy={style === 'bob' ? 0 : -0.05} rx={0.5} ry={style === 'bob' ? 0.56 : 0.54} fill={look.hair} />
      {style === 'bun' && <circle cx={-0.43} cy={-0.38} r={0.22} fill={look.hair} />}
      <ellipse cx={0.05} cy={0.05} rx={0.43} ry={0.48} fill={skin} />
      <ellipse cx={0.46} cy={0.1} rx={0.07} ry={0.1} fill={skin} />
      {style === 'bob' && <path d="M-0.5,-0.06 C-0.54,0.3 -0.42,0.48 -0.12,0.52 C-0.2,0.32 -0.16,0.12 -0.06,0 Z" fill={look.hair} />}
      <path
        d={
          style === 'short'
            ? 'M-0.38,-0.02 C-0.34,-0.5 0.18,-0.64 0.45,-0.26 C0.22,-0.32 -0.04,-0.3 -0.38,-0.02 Z'
            : 'M-0.36,-0.08 C-0.32,-0.5 0.2,-0.66 0.44,-0.22 C0.2,-0.36 -0.06,-0.34 -0.36,-0.08 Z'
        }
        fill={look.hair}
      />
      {style !== 'bob' && style !== 'long' && <ellipse cx={-0.08} cy={0.08} rx={0.08} ry={0.12} fill={skinShade} />}
      {style === 'ponytail' && <circle cx={-0.4} cy={-0.27} r={0.08} fill="#1B1715" />}
      {look.beard && (
        <g fill={look.beard}>
          <path d="M-0.04,0.14 C-0.02,0.42 0.16,0.6 0.34,0.56 C0.46,0.52 0.52,0.4 0.5,0.28 C0.42,0.34 0.3,0.36 0.2,0.3 C0.1,0.26 0.02,0.2 -0.04,0.14 Z" />
          <path d="M0.28,0.21 Q0.4,0.17 0.5,0.24 Q0.4,0.27 0.28,0.24 Z" />
        </g>
      )}
      {/* หน้า: คิ้ว ตา แก้ม ปาก */}
      <path d="M0.18,-0.13 Q0.27,-0.18 0.36,-0.12" fill="none" stroke={look.hair === '#F1F1EE' ? '#C9C9C4' : look.hair} strokeWidth={0.045} strokeLinecap="round" />
      {eyes === 'open' ? (
        <ellipse cx={0.28} cy={0.02} rx={0.045} ry={0.06} fill={C.ink} />
      ) : (
        <path
          d={eyes === 'smile' ? 'M0.2,0.01 Q0.27,0.08 0.34,0.01' : 'M0.2,0.04 Q0.27,0.07 0.34,0.04'}
          fill="none"
          stroke={C.ink}
          strokeWidth={0.045}
          strokeLinecap="round"
        />
      )}
      {!look.beard && <ellipse cx={0.2} cy={0.18} rx={0.08} ry={0.05} fill={C.blush} opacity={0.45} />}
      <path
        d={(look.mouth ?? 'smile') === 'smile' ? 'M0.3,0.27 Q0.37,0.33 0.43,0.26' : 'M0.31,0.29 L0.42,0.28'}
        fill="none"
        stroke={C.lip}
        strokeWidth={0.04}
        strokeLinecap="round"
      />
      {look.glasses && (
        <g fill="none" stroke={C.ink} strokeWidth={0.045}>
          <circle cx={0.3} cy={0.02} r={0.12} fill="rgba(255,255,255,0.35)" />
          <path d="M0.18,0.02 L-0.03,0.04" />
        </g>
      )}
    </g>
  );
}

type FrameInput = Pick<FigureProps, 'x' | 'floor' | 'hipY' | 'facing' | 'H' | 'pose' | 'legs' | 'lean' | 'headTilt'>;

/** โครงของตัวละคร: ความยาวกระดูก ความสูงสะโพก และตำแหน่งไหล่/คอ/ศีรษะ (พิกัดภายใน) */
function bodyFrame({ x, floor, hipY: hipYOverride, facing, H = 22, pose = 'stand', legs: legsProp, lean = 0, headTilt = 0 }: FrameInput) {
  const L = {
    thigh: BODY.thigh * H,
    shin: BODY.shin * H,
    ankle: BODY.ankle * H,
    ua: BODY.upperArm * H,
    fa: BODY.foreArm * H,
  };
  const legs: { near: [number, number]; far: [number, number] } =
    legsProp ?? (pose === 'sit' ? { near: [86, -2], far: [82, 2] } : { near: [3, -1], far: [-2, 1] });
  const drop = ([a, b]: [number, number]) => L.thigh * Math.cos(rad(a)) + L.shin * Math.cos(rad(b));
  const hipY = hipYOverride ?? floor - L.ankle - Math.max(drop(legs.near), drop(legs.far));
  const S = rotate([BODY.shoulder[0] * H, BODY.shoulder[1] * H], lean);
  const N = rotate([BODY.neck[0] * H, BODY.neck[1] * H], lean);
  const headC = add(N, rotate([BODY.head[0] * H, BODY.head[1] * H], lean + headTilt));
  const toLocal = ([sx, sy]: Pt): Pt => [(sx - x) * facing, sy - hipY];
  const toScene = ([u, v]: Pt): Pt => [x + u * facing, hipY + v];
  return { L, legs, hipY, S, N, headC, toLocal, toScene };
}

function Figure(props: FigureProps) {
  const { x, H = 22, lean = 0, headTilt = 0, near, far, look, nearItem, underNearArm, farOverUnder } = props;
  const { L, legs, hipY, S, N, headC, toLocal } = bodyFrame(props);
  const skinBase = look.skin ?? C.skin;
  const skinShadeBase = look.skinShade ?? C.skinShade;

  const armJoints = (arm?: ArmPose): { E: Pt; W: Pt } => {
    if (arm?.target) {
      const T = toLocal(arm.target);
      const dx = T[0] - S[0];
      const dy = T[1] - S[1];
      const dist = Math.hypot(dx, dy);
      const reach = Math.min(Math.max(dist, Math.abs(L.ua - L.fa) + 0.5), (L.ua + L.fa) * 0.999);
      const base = Math.atan2(dy, dx);
      const bendAngle = Math.acos((L.ua ** 2 + reach ** 2 - L.fa ** 2) / (2 * L.ua * reach));
      const a = base + (arm.bend ?? 1) * bendAngle;
      const E: Pt = [S[0] + L.ua * Math.cos(a), S[1] + L.ua * Math.sin(a)];
      const toT = Math.hypot(T[0] - E[0], T[1] - E[1]) || 1;
      const W: Pt = [E[0] + ((T[0] - E[0]) / toT) * L.fa, E[1] + ((T[1] - E[1]) / toT) * L.fa];
      return { E, W };
    }
    // ค่าเริ่มต้น: แขนห้อยแนบลำตัว (ตามมุมที่ลำตัวโน้ม) ไม่ยื่นออกนอกตัว
    const [a1, a2] = arm?.angles ?? [-lean + 3, -lean + 9];
    const E = add(S, dir(a1), L.ua);
    return { E, W: add(E, dir(a2), L.fa) };
  };

  const drawArm = (arm: ArmPose | undefined, shade: boolean) => {
    const { E, W } = armJoints(arm);
    const sleeve = shade ? look.topShade : look.top;
    const skin = shade ? skinShadeBase : skinBase;
    const fl = Math.hypot(W[0] - E[0], W[1] - E[1]) || 1;
    const u: Pt = [(W[0] - E[0]) / fl, (W[1] - E[1]) / fl];
    const hand = add(W, u, 0.16 * H);
    const handRot = (Math.atan2(-u[0], u[1]) * 180) / Math.PI;
    return (
      <g fill="none" strokeLinecap="round">
        <path d={`M${pt(S)} L${pt(E)}`} stroke={look.longSleeve ? sleeve : skin} strokeWidth={0.4 * H} />
        {!look.longSleeve && <path d={`M${pt(S)} L${pt(lerp(S, E, 0.55))}`} stroke={sleeve} strokeWidth={0.48 * H} />}
        <path d={`M${pt(E)} L${pt(W)}`} stroke={look.longSleeve ? sleeve : skin} strokeWidth={0.34 * H} />
        <ellipse
          cx={0}
          cy={0}
          rx={0.15 * H}
          ry={0.24 * H}
          fill={look.hands ?? skin}
          transform={`translate(${pt(hand)}) rotate(${handRot.toFixed(1)})`}
        />
        {!shade && nearItem?.(add(hand, u, 0.05 * H))}
      </g>
    );
  };

  const drawLeg = ([a, b]: [number, number], color: string) => {
    const K = add([0, 0], dir(a), L.thigh);
    const A = add(K, dir(b), L.shin);
    return (
      <g>
        <g fill="none" strokeLinecap="round" stroke={color}>
          <path d={`M0,0 L${pt(K)}`} strokeWidth={0.62 * H} />
          <path d={`M${pt(K)} L${pt(A)}`} strokeWidth={0.48 * H} />
        </g>
        <ellipse
          cx={A[0] + 0.24 * H}
          cy={A[1] + 0.13 * H}
          rx={0.42 * H}
          ry={0.17 * H}
          fill={C.shoe}
          transform={`rotate(${(b * 0.5).toFixed(1)} ${pt(A)})`}
        />
      </g>
    );
  };

  const frame = `translate(${x} ${hipY.toFixed(2)}) scale(${props.facing} 1)`;
  return (
    <g>
      <g transform={frame}>
        {!farOverUnder && drawArm(far, true)}
        {drawLeg(legs.far, look.bottomShade)}
        {drawLeg(legs.near, look.bottom)}
        {/* สะโพก หมุนตามลำตัวครึ่งหนึ่ง ไม่ให้ยื่นเป็นปุ่มเวลาโน้มตัว */}
        <ellipse
          cx={-0.02 * H}
          cy={0.08 * H}
          rx={0.47 * H}
          ry={0.34 * H}
          fill={look.bottom}
          transform={`rotate(${(lean * 0.6).toFixed(1)})`}
        />
        <path d={`M${pt(N)} L${pt(headC)}`} stroke={skinShadeBase} strokeWidth={0.32 * H} strokeLinecap="round" />
        <path
          transform={`rotate(${lean}) scale(${H})`}
          d="M-0.48,0.2 C-0.6,-0.4 -0.38,-0.9 -0.42,-1.2 C-0.46,-1.6 -0.58,-1.9 -0.5,-2.25 C-0.42,-2.48 -0.2,-2.52 0,-2.52 C0.25,-2.52 0.42,-2.36 0.48,-2.06 C0.56,-1.76 0.5,-1.5 0.4,-1.3 C0.32,-1.1 0.36,-0.6 0.46,-0.25 C0.5,0 0.45,0.15 0.38,0.2 Z"
          fill={look.top}
        />
        <g transform={`translate(${pt(headC)}) rotate(${lean + headTilt})`}>
          <Head look={look} H={H} />
        </g>
      </g>
      {underNearArm}
      <g transform={frame}>
        {farOverUnder && drawArm(far, true)}
        {drawArm(near, false)}
      </g>
    </g>
  );
}

const FLOOR = 192;

/**
 * กรอบรูปของการ์ดบริการ — วาดฉากบนพื้นที่ 400×220 แล้วครอปเข้าใกล้คน (view) สัดส่วน 16:10
 * ให้ตรงกับกล่องรูปในการ์ด (aspect-[8/5]) คนจึงตัวใหญ่ใกล้เคียงรูปตัวอย่าง
 */
function Room({
  label,
  wall,
  floor,
  view,
  children,
}: {
  label: string;
  wall: string;
  floor: string;
  view: [number, number];
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`${view[0]} ${view[1]} 290 181`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
      className="h-full w-full"
    >
      <rect x={-20} y={-20} width={440} height={260} fill={wall} />
      <rect x={-20} y={FLOOR} width={440} height={48} fill={floor} />
      {children}
    </svg>
  );
}

function Trees({ blobs }: { blobs: [number, number, number, string][] }) {
  return (
    <g>
      {blobs.map(([cx, cy, r, fill]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} />
      ))}
    </g>
  );
}

function Leafy({ x, y, scale = 1, pot = '#E9E2D6' }: { x: number; y: number; scale?: number; pot?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0,-30 Q-20,-46 -16,-68 Q2,-56 0,-30 Z" fill="#6FAF82" />
      <path d="M0,-30 Q18,-50 13,-74 Q-4,-56 0,-30 Z" fill="#5E9E73" />
      <path d="M0,-28 Q-24,-28 -28,-46 Q-8,-46 0,-28 Z" fill="#8DC49A" />
      <path d="M-13,-30 H13 L10,0 H-10 Z" fill={pot} />
    </g>
  );
}

/** ดูแลผู้สูงอายุ — ผู้ดูแลชุดน้ำเงินช่วยคุณยายที่เดินด้วยวอล์คเกอร์ ในห้องนั่งเล่นริมหน้าต่าง */
export function ElderCareArt({ label }: { label: string }) {
  const walker = (
    <g stroke={C.metal} strokeLinecap="round" fill="none">
      <path d="M188,191 L192,121" strokeWidth={3.2} />
      <path d="M216,191 L213,121" strokeWidth={3.2} />
      <path d="M191,121 L216,121" strokeWidth={3.4} />
      <path d="M190,160 L215,160" strokeWidth={2.4} />
      <rect x={207} y={117.5} width={11} height={6} rx={3} fill={C.metalDark} stroke="none" />
      <rect x={185} y={189} width={7} height={4} rx={1.5} fill={C.rubber} stroke="none" />
      <rect x={213} y={189} width={7} height={4} rx={1.5} fill={C.rubber} stroke="none" />
    </g>
  );
  return (
    <Room label={label} wall="#F4F1EA" floor="#E3D3BC" view={[62, 20]}>
      {/* หน้าต่างเห็นต้นไม้ข้างนอก */}
      <rect x={24} y={24} width={106} height={128} rx={3} fill={C.white} />
      <clipPath id="pyg-art-window">
        <rect x={30} y={30} width={94} height={116} />
      </clipPath>
      <rect x={30} y={30} width={94} height={116} fill="#DDEFE8" />
      <g clipPath="url(#pyg-art-window)">
        <Trees
          blobs={[
            [44, 128, 30, '#8DC49A'],
            [82, 138, 34, '#6FAF82'],
            [118, 118, 26, '#7DB98D'],
            [60, 100, 20, '#9CCDA6'],
          ]}
        />
      </g>
      <path d="M77,30 V146 M30,88 H124" stroke={C.white} strokeWidth={4} />
      <rect x={20} y={150} width={114} height={6} rx={2} fill="#E9E2D6" />

      {/* ชั้นวางของ */}
      <rect x={276} y={92} width={74} height={5} fill="#D9C6A8" />
      <rect x={276} y={136} width={74} height={5} fill="#D9C6A8" />
      <g>
        <rect x={282} y={66} width={9} height={26} fill="#7FA9C9" />
        <rect x={292} y={70} width={8} height={22} fill="#E3B26B" />
        <rect x={301} y={64} width={10} height={28} fill="#9BC4A0" />
        <rect x={312} y={72} width={8} height={20} fill="#D98C77" rx={1} transform="rotate(-10 316 92)" />
      </g>
      <Leafy x={334} y={136} scale={0.55} />
      <rect x={0} y={186} width={400} height={6} fill="#ECE5D9" />

      <Figure
        x={242}
        floor={FLOOR}
        facing={-1}
        H={20.5}
        lean={14}
        headTilt={2}
        legs={{ near: [6, -2], far: [-4, 4] }}
        look={LOOK.grandma}
        far={{ target: [213, 123] }}
        near={{ target: [210, 122] }}
        underNearArm={walker}
        farOverUnder
      />
      <Figure
        x={176}
        floor={FLOOR}
        facing={1}
        lean={10}
        headTilt={4}
        look={LOOK.caregiver}
        near={{ target: [209, 114] }}
      />
    </Room>
  );
}

/** ดูแลผู้ป่วยติดเตียง — ผู้ดูแลสวมถุงมือเช็ดแขนผู้ป่วยบนเตียง มีอ่าง เหยือกน้ำ ผ้าขนหนู */
export function BedCareArt({ label }: { label: string }) {
  const patientSkin = '#EFC6A6';
  const bed = (
    <g>
      {/* เตียง */}
      <rect x={92} y={92} width={9} height={100} rx={3} fill="#9AA9B1" />
      <rect x={318} y={108} width={9} height={84} rx={3} fill="#9AA9B1" />
      <rect x={96} y={140} width={226} height={10} rx={3} fill="#B9C5CB" />
      <rect x={104} y={150} width={6} height={34} fill="#9AA9B1" />
      <rect x={306} y={150} width={6} height={34} fill="#9AA9B1" />
      <circle cx={107} cy={187} r={5} fill={C.rubber} />
      <circle cx={309} cy={187} r={5} fill={C.rubber} />
      <rect x={98} y={126} width={222} height={15} rx={5} fill={C.white} />

      {/* ผู้ป่วยนอนหงาย */}
      <ellipse cx={124} cy={124} rx={22} ry={7} fill={C.white} stroke="#D5E0E4" strokeWidth={1.4} />
      <g transform="translate(126 112) rotate(-90)">
        <Head
          look={{ ...LOOK.patientMan, hair: '#BFC3C6', skin: patientSkin, eyes: 'closed', mouth: 'flat' }}
          H={20}
        />
      </g>
      <path d="M138,126 Q140,113 154,112 L170,113 Q172,120 170,126 Z" fill="#CFE3F2" />
      <path
        d="M150,128 Q152,115 170,114 Q196,114 214,119 Q260,123 318,122 L318,134 L150,134 Z"
        fill="#F3F7F9"
      />
      <path d="M150,124 Q200,121 318,124" fill="none" stroke="#BCD6EE" strokeWidth={4} />
      <path d="M232,128 Q262,131 296,129" fill="none" stroke="#DCE6EB" strokeWidth={2} strokeLinecap="round" />
      {/* แขนผู้ป่วยวางบนผ้าห่ม */}
      <g fill="none" strokeLinecap="round">
        <path d="M150,117 L174,121" stroke={patientSkin} strokeWidth={8} />
        <path d="M150,117 L162,119" stroke="#CFE3F2" strokeWidth={9.5} />
        <path d="M174,121 L198,120" stroke={patientSkin} strokeWidth={6.8} />
      </g>
      <ellipse cx={203} cy={120} rx={5} ry={3.2} fill={patientSkin} />
    </g>
  );
  return (
    <Room label={label} wall="#EDF3F2" floor="#D9E2E0" view={[44, 20]}>
      {/* แผงปลั๊กบนผนัง */}
      <rect x={244} y={34} width={84} height={22} rx={4} fill="#DCE5E3" />
      {[254, 274, 294].map((sx) => (
        <g key={sx}>
          <rect x={sx} y={39} width={12} height={12} rx={2} fill={C.white} />
          <circle cx={sx + 4} cy={45} r={1.2} fill="#8C989D" />
          <circle cx={sx + 8} cy={45} r={1.2} fill="#8C989D" />
        </g>
      ))}
      <circle cx={318} cy={45} r={2.4} fill={C.primary} />

      {/* โต๊ะข้างเตียง: เหยือกน้ำ ผ้าขนหนู อ่างน้ำ */}
      <rect x={18} y={114} width={68} height={7} rx={2} fill="#CED9D6" />
      <rect x={22} y={121} width={60} height={71} fill="#E3EAE8" />
      <path d="M22,150 H82" stroke="#CED9D6" strokeWidth={1.5} />
      <path d="M30,114 L32,86 Q32,82 36,82 L46,82 Q50,82 50,86 L52,114 Z" fill={C.white} stroke="#D5E0E4" strokeWidth={1.2} />
      <path d="M50,90 Q58,92 56,102 Q55,106 51,106" fill="none" stroke="#D5E0E4" strokeWidth={2} />
      <rect x={56} y={104} width={26} height={5} rx={2} fill="#7FB2E5" />
      <rect x={57} y={99} width={24} height={5} rx={2} fill="#A9CDF0" />
      <path d="M56,114 Q58,108 66,108 H80 Q86,108 86,114 Z" fill={C.white} stroke="#D5E0E4" strokeWidth={1.2} />

      <Figure
        x={214}
        floor={FLOOR}
        facing={-1}
        lean={34}
        headTilt={12}
        look={LOOK.nurse}
        near={{ target: [186, 118] }}
        far={{ target: [205, 119] }}
        nearItem={(hand) => (
          <g transform={`translate(${pt(hand)}) rotate(-20)`}>
            <rect x={-7} y={-3.5} width={14} height={8} rx={2.5} fill={C.white} stroke="#D5E0E4" strokeWidth={0.8} />
            <path d="M-4,0.5 H4" stroke="#DCE6EB" strokeWidth={0.8} />
          </g>
        )}
        underNearArm={bed}
        farOverUnder
      />
    </Room>
  );
}

/** กายภาพบำบัด — คุณลุงบนรถเข็นยกดัมเบล นักกายภาพฯ ชุดม่วงยืนด้านหลังประคองแขน */
export function PhysioArt({ label }: { label: string }) {
  const patient = { x: 160, floor: FLOOR, facing: 1 as const, H: 21.5, pose: 'sit' as const };
  const pf = bodyFrame(patient);
  const elbowL = add(pf.S, dir(84), pf.L.ua);
  const elbow = pf.toScene(elbowL);
  const wrist = pf.toScene(add(elbowL, dir(90), pf.L.fa));
  const forearmMid = lerp(elbow, wrist, 0.45);

  const wheelchairBack = (
    <g>
      {/* ล้อหลังใหญ่ (มองทะลุซี่ล้อได้) */}
      <circle cx={150} cy={164} r={27} fill="none" stroke={C.rubber} strokeWidth={4} />
      <circle cx={150} cy={164} r={22} fill="none" stroke="#C9D0D4" strokeWidth={1.5} />
      <g stroke="#B5BEC4" strokeWidth={1}>
        {[0, 30, 60, 90, 120, 150].map((a) => (
          <path key={a} d={`M${pt(add([150, 164], dir(a), 25))} L${pt(add([150, 164], dir(a + 180), 25))}`} />
        ))}
      </g>
      <circle cx={150} cy={164} r={3.5} fill="#8C989D" />
      {/* โครง พนักพิง มือจับ */}
      <path d="M140,152 L133,100 L121,100" fill="none" stroke={C.metalDark} strokeWidth={3} strokeLinecap="round" />
      <path d="M121,100 L127,100" stroke={C.rubber} strokeWidth={4.5} strokeLinecap="round" />
      <path d="M135,104 L143,104 L146,150 L138,150 Z" fill="#3F4A52" />
      <rect x={136} y={147} width={58} height={8} rx={3} fill="#3F4A52" />
      <path d="M142,125 L184,125 M182,125 L186,150" fill="none" stroke={C.metalDark} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
  const wheelchairFront = (
    <g>
      <path d="M190,155 L204,184 L214,184" fill="none" stroke={C.metalDark} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={194} cy={186} r={6} fill={C.rubber} />
      <circle cx={194} cy={186} r={2} fill="#8C989D" />
    </g>
  );
  return (
    <Room label={label} wall="#F5F2EC" floor="#E6DCCD" view={[52, 20]}>
      {/* ม่านโปร่ง */}
      <rect x={0} y={12} width={78} height={3} fill="#D9D2C6" />
      <path d="M0,15 H74 Q70,100 76,192 H0 Z" fill={C.white} opacity={0.9} />
      <g stroke="#ECE6DC" strokeWidth={2}>
        <path d="M16,15 Q12,100 16,192" fill="none" />
        <path d="M36,15 Q40,100 34,192" fill="none" />
        <path d="M56,15 Q52,100 58,192" fill="none" />
      </g>
      <Leafy x={318} y={FLOOR} scale={0.9} pot="#E2D6C4" />
      <rect x={0} y={186} width={400} height={6} fill="#EDE6DB" />

      <Figure
        x={172}
        floor={FLOOR}
        facing={1}
        lean={10}
        headTilt={14}
        look={LOOK.therapist}
        far={{ target: [176, 100] }}
        near={{ target: [forearmMid[0], forearmMid[1] + 5] }}
        underNearArm={
          <>
            {wheelchairBack}
            <Figure
              {...patient}
              look={LOOK.patientMan}
              far={{ angles: [40, 80] }}
              near={{ angles: [84, 90] }}
              nearItem={(hand) => (
                <g transform={`translate(${pt(hand)})`}>
                  <rect x={-2} y={-9} width={4} height={18} rx={2} fill="#4A5258" />
                  <rect x={-5.5} y={-13} width={11} height={7} rx={3} fill="#3E8EDB" />
                  <rect x={-5.5} y={6} width={11} height={7} rx={3} fill="#3E8EDB" />
                </g>
              )}
            />
            {wheelchairFront}
          </>
        }
      />
    </Room>
  );
}

/** ดูแลระหว่างพบแพทย์ — ผู้ดูแลจับมือพาคุณตาลงจากรถ */
export function DoctorVisitArt({ label }: { label: string }) {
  return (
    <Room label={label} wall="#E7F1F5" floor="#D5DAD7" view={[40, 20]}>
      <Trees
        blobs={[
          [180, 40, 46, '#A6D19A'],
          [250, 30, 52, '#8CC285'],
          [330, 46, 50, '#79B574'],
          [392, 30, 44, '#8CC285'],
          [120, 64, 34, '#8CC285'],
        ]}
      />
      <rect x={0} y={150} width={400} height={42} fill="#BCD9AC" />
      <rect x={0} y={186} width={400} height={6} fill="#C9CFCB" />

      {/*
        รถ SUV มองด้านข้าง หัวรถไปทางซ้าย (ขนาดเทียบคน: หลังคาสูงราวศีรษะ ล้อรัศมี ~0.3 ม.)
        เรียงตามโครงสร้างจริง: กระจกหน้า/เสา A → ประตูหน้า → เสา B → ประตูหลัง → เสา C → ซุ้มล้อหลัง → ไฟท้าย
        ประตูหลังเปิดออกหาคนดู บานพับอยู่ที่ขอบหน้า (เสา B) จึงเห็นแผงด้านในที่หดสั้นลงตามมุมเปิด
        และมองเข้าไปเห็นเบาะหลังกับกระจกฝั่งตรงข้าม ขอบล่างด้านหลังของช่องประตูโค้งตามซุ้มล้อ
      */}
      <g>
        {/* ตัวถัง + ซุ้มล้อ */}
        <path
          d="M-60,174 L-60,104 Q-56,95 -40,95 L26,93 L62,55 Q66,52 74,52 L214,54 Q224,54 228,60 L244,94 Q248,96 248,104 L248,168 Q248,174 242,174 L239.1,174 A33,33 0 1 0 176.9,174 L31.1,174 A33,33 0 1 0 -35.1,174 Z"
          fill="#C5CBD0"
        />
        <path d="M31,162 H177" stroke="#AEB4BA" strokeWidth={10} />
        <path d="M30,121 Q130,118 246,119" fill="none" stroke="#B5BCC1" strokeWidth={1.5} />
        {/* กระจกหน้า กระจกประตูหน้า เสา B กระจกแคบหลังเสา C กระจกบานท้าย */}
        <path d="M28,93 L62,56 L66,55 L40,93 Z" fill="#56626B" />
        <path d="M44,95 L72,60 L124,59 L124,96 Z" fill="#56626B" />
        <path d="M84,60 L74,95 M100,59 L90,95" stroke="#6E7A83" strokeWidth={3} />
        <rect x={124} y={56} width={12} height={106} fill="#3F474D" />
        <path d="M209,61 L222,61 L234,92 L209,94 Z" fill="#56626B" />
        <path d="M229,62 L243,93" stroke="#56626B" strokeWidth={4} strokeLinecap="round" />
        {/* รอยต่อประตูหน้า มือจับ กระจกมองข้าง */}
        <path d="M34,98 V162" stroke="#A3AAB0" strokeWidth={1.2} />
        <rect x={104} y={104} width={14} height={4} rx={2} fill="#A3AAB0" />
        <path d="M40,90 Q38,82 48,82 L54,84 L52,92 Z" fill="#B3BAC0" />

        {/* ช่องประตูหลังที่เปิดอยู่: มองเห็นในห้องโดยสาร */}
        <path d="M136,58 L204,59 Q207,60 207,64 L207,128 Q190,131 182,148 L178,162 L136,162 Z" fill="#3A4248" />
        <path d="M140,63 L201,64 L201,94 L140,94 Z" fill="#8D99A1" />
        <path d="M176,96 L198,96 L203,132 L174,132 Z" fill="#5E686F" />
        <rect x={140} y={126} width={60} height={12} rx={4} fill="#68737A" />
        <rect x={136} y={152} width={46} height={10} fill="#30373C" />

        {/* ไฟท้าย กันชนหลัง */}
        <path d="M240,97 L247,100 L247,120 L241,120 Z" fill="#D9534F" />
        <rect x={236} y={150} width={13} height={24} rx={3} fill="#AEB4BA" />

        {/* ล้อหลัง (ซุ้มล้อด้านในสีเข้ม ไม่ให้เห็นพื้นหลังทะลุ) */}
        <path d="M239.1,174 A33,33 0 1 0 176.9,174 Z" fill="#2A2F33" />
        <circle cx={208} cy={163} r={28} fill={C.rubber} />
        <circle cx={208} cy={163} r={17} fill="#B9C0C5" />
        <g stroke="#8C949A" strokeWidth={3} strokeLinecap="round">
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d={`M${pt(add([208, 163], dir(a), 5))} L${pt(add([208, 163], dir(a), 15))}`} />
          ))}
        </g>
        <circle cx={208} cy={163} r={5} fill="#8C949A" />

        {/* บานประตูหลังที่เปิดออก (เห็นด้านใน) — กว้างจริง ~71 หน่วย เปิด ~65° เหลือ ~30 */}
        <path d="M136,57 L167,61 L169,167 L136,162 Z" fill="#D5DADE" />
        <path d="M138,60 L165,63.5 L165.5,98 L138,96 Z" fill="#56626B" />
        <path d="M141,62 L152,63 L146,94 L141,94 Z" fill="#6E7A83" />
        <path d="M139,118 L166,121" stroke="#B9C0C5" strokeWidth={3} strokeLinecap="round" />
        <rect x={143} y={130} width={18} height={20} rx={3} fill="#C3C9CE" />
        <path d="M167,61 L171,63 L173,166 L169,167 Z" fill="#9AA2A8" />
      </g>

      <Figure
        x={198}
        floor={FLOOR}
        facing={1}
        H={21}
        lean={16}
        headTilt={-4}
        legs={{ near: [16, 2], far: [-8, -14] }}
        look={LOOK.grandpa}
        far={{ target: [168, 112] }}
        near={{ target: [236, 117] }}
      />
      <Figure
        x={266}
        floor={FLOOR}
        facing={-1}
        lean={10}
        headTilt={6}
        look={LOOK.escort}
        far={{ target: [222, 88] }}
        near={{ target: [240, 115] }}
      />
    </Room>
  );
}

function Heart({ x, y, size = 1, color = C.orange }: { x: number; y: number; size?: number; color?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M0,6 C-9,-1 -9,-9 -4.5,-10 C-2,-10.5 -0.5,-9 0,-7 C0.5,-9 2,-10.5 4.5,-10 C9,-9 9,-1 0,6 Z"
      fill={color}
    />
  );
}

/** ภาพประกอบส่วนชวนสมัคร (พื้นหลังเขียวเข้ม) — ผู้ดูแลกับคุณยายจับมือกันหน้าบ้าน */
export function FamilyCareArt({ className = '' }: { className?: string }) {
  const ground = 282;
  const hands: Pt = [181, 182];
  return (
    <svg viewBox="0 0 360 320" role="img" aria-label="ผู้ดูแลกับผู้สูงอายุหน้าบ้าน" className={className}>
      <circle cx={180} cy={172} r={140} fill="#0B6B4B" />
      <circle cx={180} cy={172} r={104} fill="#127A57" />

      {/* บ้าน */}
      <path d="M70,150 L180,74 L290,150 Z" fill={C.orange} />
      <rect x={90} y={146} width={180} height={136} fill={C.white} />
      <rect x={160} y={214} width={40} height={68} rx={4} fill={C.light} />
      <circle cx={192} cy={250} r={2.5} fill={C.white} />
      <rect x={108} y={170} width={36} height={32} rx={4} fill={C.cream} />
      <rect x={216} y={170} width={36} height={32} rx={4} fill={C.cream} />
      <path d="M126,170 V202 M108,186 H144 M234,170 V202 M216,186 H252" stroke={C.white} strokeWidth={2.5} />
      <rect x={40} y={ground} width={280} height={10} rx={5} fill="#0A5C40" />

      <Figure
        x={134}
        floor={ground}
        facing={1}
        H={26}
        lean={6}
        headTilt={2}
        look={{ ...LOOK.grandma, top: '#FFD08A', topShade: '#E9B96F' }}
        near={{ target: [hands[0] - 3, hands[1]] }}
      />
      <Figure
        x={226}
        floor={ground}
        facing={-1}
        H={27}
        lean={4}
        headTilt={6}
        look={LOOK.caregiver}
        near={{ target: [hands[0] + 3, hands[1] - 2] }}
      />

      {/* ป้ายลอย */}
      <g transform="translate(52 64)">
        <rect x={-30} y={-20} width={60} height={40} rx={12} fill={C.white} />
        <circle cx={-10} cy={0} r={10} fill={C.primary} />
        <path d="M-14.5,0 L-11,3.5 L-5,-3.5" fill="none" stroke={C.white} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={4} y={-5} width={18} height={4} rx={2} fill={C.pale} />
        <rect x={4} y={3} width={12} height={4} rx={2} fill={C.pale} />
      </g>
      <g transform="translate(306 82)">
        <circle r={22} fill={C.white} />
        <Heart x={0} y={2} size={1.4} />
      </g>
      <g fill={C.white} opacity={0.9}>
        <circle cx={300} cy={140} r={3} />
        <circle cx={62} cy={130} r={2.5} />
        <circle cx={180} cy={40} r={2} />
      </g>
    </svg>
  );
}
