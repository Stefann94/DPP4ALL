// DPP4ALL logo mark (concept L10 "Cip digital"): passport cover with a contact chip.
// size = height in px (the mark is cropped tight, so it reads larger). c = cover colour, bg = colour of the spine/lines (usually the background), a = chip colour.
export function LogoMark({ size = 30, c = '#0e7c86', bg = '#ffffff', a = '#5eead4', title }: { size?: number; c?: string; bg?: string; a?: string; title?: string }) {
  return (
    <svg viewBox="9.5 3.5 29 41" width={Math.round(size * 29 / 41)} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect x="11" y="5" width="26" height="38" rx="4.5" fill={c} />
      <line x1="16" y1="8" x2="16" y2="40" stroke={bg} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      <rect x="19" y="14" width="15" height="12" rx="2.6" fill={a} />
      <path d="M19 20 H23.5 M29.5 20 H34 M26.5 14 V17.5 M26.5 22.5 V26 M23.5 17.5 H29.5 V22.5 H23.5 Z" fill="none" stroke={c} strokeWidth="1.3" />
      <rect x="19" y="32" width="15" height="2.2" rx="1.1" fill={bg} opacity=".75" />
    </svg>
  );
}
