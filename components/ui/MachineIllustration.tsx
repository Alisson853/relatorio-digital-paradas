const GRADIENT_ID = "machineGradient";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 480 480" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a83d4" />
          <stop offset="100%" stopColor="#0f2a56" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="240" cy="240" r="220" fill="url(#glow)" />
      {children}
    </svg>
  );
}

function IndustrialPress() {
  return (
    <Frame>
      <rect x="140" y="60" width="200" height="40" rx="8" fill="url(#machineGradient)" />
      <rect x="215" y="100" width="50" height="140" fill="url(#machineGradient)" opacity="0.9" />
      <rect x="150" y="240" width="180" height="26" rx="6" fill="#7fabe5" />
      <rect x="120" y="280" width="240" height="130" rx="16" fill="url(#machineGradient)" />
      <rect x="150" y="310" width="180" height="70" rx="8" fill="rgba(255,255,255,0.12)" />
      <rect x="90" y="410" width="300" height="24" rx="10" fill="#0a1e3f" />
      <circle cx="170" cy="345" r="6" fill="#f0f6fd" />
      <circle cx="310" cy="345" r="6" fill="#f0f6fd" />
    </Frame>
  );
}

function Furnace() {
  return (
    <Frame>
      <rect x="130" y="90" width="220" height="260" rx="24" fill="url(#machineGradient)" />
      <circle cx="240" cy="220" r="60" fill="#0a1e3f" />
      <circle cx="240" cy="220" r="40" fill="#f5a94e" opacity="0.85" />
      <circle cx="240" cy="220" r="22" fill="#ffd479" />
      <rect x="150" y="360" width="180" height="24" rx="8" fill="#7fabe5" />
      <rect x="100" y="392" width="280" height="22" rx="10" fill="#0a1e3f" />
      <rect x="215" y="60" width="50" height="40" rx="6" fill="#7fabe5" />
    </Frame>
  );
}

function Compressor() {
  return (
    <Frame>
      <rect x="110" y="150" width="120" height="180" rx="18" fill="url(#machineGradient)" />
      <circle cx="170" cy="180" r="26" fill="#7fabe5" />
      <rect x="250" y="120" width="130" height="90" rx="14" fill="url(#machineGradient)" opacity="0.9" />
      <rect x="250" y="220" width="130" height="110" rx="14" fill="#0f2a56" />
      <rect x="120" y="340" width="260" height="24" rx="10" fill="#0a1e3f" />
      <circle cx="315" cy="165" r="10" fill="#f0f6fd" />
      <rect x="280" y="250" width="70" height="10" rx="5" fill="rgba(255,255,255,0.3)" />
      <rect x="280" y="270" width="70" height="10" rx="5" fill="rgba(255,255,255,0.3)" />
    </Frame>
  );
}

function BottlingLine() {
  return (
    <Frame>
      <rect x="80" y="260" width="320" height="30" rx="10" fill="url(#machineGradient)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={110 + i * 45} y="190" width="26" height="70" rx="5" fill="#7fabe5" opacity={0.5 + (i % 3) * 0.15} />
      ))}
      <rect x="150" y="120" width="180" height="60" rx="12" fill="url(#machineGradient)" opacity="0.9" />
      <rect x="100" y="290" width="280" height="20" rx="8" fill="#0a1e3f" />
      <rect x="70" y="310" width="20" height="60" rx="6" fill="#0f2a56" />
      <rect x="390" y="310" width="20" height="60" rx="6" fill="#0f2a56" />
    </Frame>
  );
}

function Boiler() {
  return (
    <Frame>
      <rect x="170" y="60" width="140" height="300" rx="70" fill="url(#machineGradient)" />
      <rect x="200" y="100" width="80" height="220" rx="40" fill="rgba(255,255,255,0.12)" />
      <rect x="140" y="380" width="200" height="26" rx="10" fill="#0a1e3f" />
      <rect x="150" y="360" width="20" height="24" fill="#0f2a56" />
      <rect x="310" y="360" width="20" height="24" fill="#0f2a56" />
      <circle cx="240" cy="90" r="14" fill="#7fabe5" />
    </Frame>
  );
}

function Conveyor() {
  return (
    <Frame>
      <rect x="70" y="220" width="340" height="26" rx="12" fill="url(#machineGradient)" />
      <rect x="70" y="270" width="340" height="14" rx="7" fill="#0f2a56" />
      <circle cx="100" cy="233" r="26" fill="#7fabe5" />
      <circle cx="380" cy="233" r="26" fill="#7fabe5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={120 + i * 55} y="170" width="34" height="34" rx="6" fill="url(#machineGradient)" opacity={0.7 + (i % 2) * 0.2} />
      ))}
      <rect x="90" y="290" width="20" height="90" fill="#0a1e3f" />
      <rect x="370" y="290" width="20" height="90" fill="#0a1e3f" />
    </Frame>
  );
}

const REGISTRY: Record<string, () => React.JSX.Element> = {
  "industrial-press": IndustrialPress,
  furnace: Furnace,
  compressor: Compressor,
  "bottling-line": BottlingLine,
  boiler: Boiler,
  conveyor: Conveyor,
};

export function MachineIllustration({ variant, className }: { variant: string; className?: string }) {
  const Component = REGISTRY[variant] ?? IndustrialPress;
  return (
    <div className={className}>
      <Component />
    </div>
  );
}
