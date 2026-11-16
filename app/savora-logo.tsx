type SavoraLogoMarkProps = {
  className?: string;
  title?: string;
  /** Draw every seed in the current text colour (single-colour and reversed use). */
  mono?: boolean;
};

// The seed circle: six staples from different kitchens, each a single brush mark, set as a
// plate seen from above. Angles and tilts are deliberately uneven so the ring reads as drawn.
export const seeds = [
  { name: "rice", color: "var(--sv-moss, #2f5236)", at: 4, tilt: -8, d: "M-10 1C-8-4 4-6 10-2c1 2 0 4-3 5-6 2-15 2-17-2Z" },
  { name: "bean", color: "var(--sv-clay, #a8482c)", at: 62, tilt: 6, d: "M-8-3c4-5 14-4 17 2 1 5-4 8-7 5-2-2-4-2-6 0-4 2-7-3-4-7Z" },
  { name: "maize", color: "var(--sv-honey, #d79a2b)", at: 121, tilt: 0, d: "M-5-7c4-2 9-1 11 2 1 6-2 12-6 13-4-1-8-8-5-15Z" },
  { name: "lentil", color: "var(--sv-leaf, #6f8f55)", at: 183, tilt: 0, d: "M-6-2c1-5 10-6 12 0 2 6-4 10-8 8-4-1-5-4-4-8Z" },
  { name: "chile", color: "var(--sv-chile, #7c2f1c)", at: 241, tilt: 10, d: "M-11 2C-8-5 2-8 11-5 7-3 5 0 3 4c-3 4-12 3-14-2Z" },
  { name: "sesame", color: "var(--sv-earth, #8a6a3f)", at: 301, tilt: -12, d: "M0-8c4 4 5 10 3 13-2 3-6 2-7-1-1-4 1-9 4-12Z" },
] as const;

export function SavoraLogoMark({ className, title, mono = false }: SavoraLogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="-36 -36 72 72"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {seeds.map((seed, index) => (
        <g key={seed.name} transform={`rotate(${seed.at}) translate(0 -22) rotate(${seed.tilt})`}>
          {/* The inner group is what the once-per-session launch animation moves. */}
          <g data-seed={index} style={{ ["--seed" as string]: index }}>
            <path d={seed.d} fill={mono ? "currentColor" : seed.color} />
          </g>
        </g>
      ))}
    </svg>
  );
}
