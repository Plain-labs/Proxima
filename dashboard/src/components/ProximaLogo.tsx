interface ProximaLogoProps {
  size?: number;
  showWordmark?: boolean;
}

export default function ProximaLogo({ size = 40, showWordmark = true }: ProximaLogoProps) {
  const uid = `plg-${size}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Proxima"
        role="img"
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00c8ff" />
            <stop offset="100%" stopColor="#7838ff" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="64" height="64" rx="12" fill="#0a0f1a" />

        {/* Border */}
        <rect width="64" height="64" rx="12"
          stroke={`url(#${uid})`} strokeWidth="1.5" opacity="0.3" />

        {/* PX monogram */}
        <text
          x="32" y="42"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="30"
          fontWeight="700"
          fill={`url(#${uid})`}
          textAnchor="middle"
          letterSpacing="-1"
        >
          PX
        </text>
      </svg>

      {showWordmark && (
        <div>
          <div style={{
            fontSize: "16px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            color: "#ffffff",
            lineHeight: 1.1,
          }}>
            PROXIMA
          </div>
          <div style={{
            fontSize: "9px",
            color: "rgba(0,200,255,0.6)",
            letterSpacing: "0.18em",
            marginTop: "3px",
          }}>
            AI AGENT REGISTRY
          </div>
        </div>
      )}
    </div>
  );
}
