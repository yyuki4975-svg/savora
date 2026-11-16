"use client";

import { seeds } from "./savora-logo";

// Last resort when the root layout itself fails: no fonts, providers or stylesheets can be assumed,
// so this page carries its own markup and inline styles. Chinese is shown alongside English because
// the language setting lives in a provider that is unavailable here.
// https://nextjs.org/docs/app/api-reference/file-conventions/error#global-error
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "#faf5e9", color: "#20301f", fontFamily: "Georgia, 'Songti SC', serif" }}>
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <svg viewBox="-36 -36 72 72" width="96" height="96" aria-hidden="true">
            {seeds.map((seed) => <g key={seed.name} transform={`rotate(${seed.at}) translate(0 -22) rotate(${seed.tilt})`}><path d={seed.d} fill={seed.color.replace(/^var\(--[\w-]+, (#\w+)\)$/, "$1")} /></g>)}
          </svg>
          <h1 style={{ margin: "18px 0 8px", fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>Something spilled in the kitchen.</h1>
          <p style={{ margin: 0, fontSize: 18 }}>页面出了点问题，你保存的内容没有丢失。</p>
          <p style={{ margin: "12px 0 24px", color: "#55604f", fontFamily: "system-ui, sans-serif", fontSize: 16 }}>Savora could not load this page. Nothing you saved was lost.</p>
          <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 22px", border: 0, borderRadius: 6, background: "#e8b75a", color: "#20301f", font: "700 16px system-ui, sans-serif", cursor: "pointer" }}>Try again · 重试</button>
          {error.digest ? <p style={{ marginTop: 20, color: "#55604f", fontFamily: "system-ui, sans-serif", fontSize: 13 }}>Reference <code>{error.digest}</code></p> : null}
        </main>
      </body>
    </html>
  );
}
