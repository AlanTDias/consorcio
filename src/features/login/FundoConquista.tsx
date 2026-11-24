export function FundoConquista() {
  return (
    <svg className="login-padrao" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="conquista" width="180" height="180" patternUnits="userSpaceOnUse">
          <g
            fill="none"
            stroke="#C9CDD2"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <g transform="translate(20 22)">
              <path d="M2 18 20 4l18 14v18H2Z" />
              <path d="M16 36V26h8v10" />
            </g>
            <g transform="translate(104 40) rotate(-18)">
              <circle cx="9" cy="10" r="7" />
              <circle cx="9" cy="10" r="2.5" />
              <path d="M16 10h26M36 10v6M30 10v4" />
            </g>
            <g transform="translate(40 118)">
              <path d="M2 18v-6l7-8h22l8 8h3v6Z" />
              <circle cx="11" cy="19" r="3.5" />
              <circle cx="32" cy="19" r="3.5" />
            </g>
            <g transform="translate(128 128)">
              <path d="M0 14 8 6l6 5 10-10" />
              <path d="M18 1h6v6" />
            </g>
          </g>
        </pattern>
        <radialGradient id="brilho" cx="50%" cy="0%" r="75%">
          <stop offset="0%" stopColor="#FF6A13" stopOpacity="0.16" />
          <stop offset="60%" stopColor="#FF6A13" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#conquista)" opacity="0.07" />
      <rect width="100%" height="100%" fill="url(#brilho)" />
    </svg>
  )
}
