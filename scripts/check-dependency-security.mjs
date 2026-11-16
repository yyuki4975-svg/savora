import { spawnSync } from "node:child_process";
import { checkBracesPatch } from "./dependency-patches/braces-depth.mjs";

const repositoryRoot = new URL("../", import.meta.url);
function checkNpm(directory, label) {
  if (!process.env.npm_execpath) throw new Error("Run this gate through npm run security:audit.");
  const args = [process.env.npm_execpath, ...(directory ? ["--prefix", directory] : []), "audit", "--json"];
  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, shell: false,
  });
  if (result.error) throw new Error(`${label} audit could not start.`);
  let report;
  try { report = JSON.parse(result.stdout); } catch { throw new Error(`${label} audit did not return JSON.`); }
  const counts = report.metadata?.vulnerabilities;
  if (!counts) throw new Error(`${label} audit did not include vulnerability totals.`);
  console.log(`${label}: ${counts.total ?? 0} findings (${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low).`);
  if ((counts.critical ?? 0) + (counts.high ?? 0) > 0) {
    const packages = Object.values(report.vulnerabilities ?? {})
      .filter(v => v.severity === "critical" || v.severity === "high")
      .map(v => `${v.name} (${v.severity})`).join(", ");
    throw new Error(`${label} release-blocking findings: ${packages}`);
  }
}
try {
  const failures = [];
  try {
    checkBracesPatch();
    console.log("Braces local depth backport verified. Raw npm high findings remain release-blocking; no advisory is suppressed.");
  } catch (error) { failures.push(error instanceof Error ? error.message : String(error)); }
  for (const [directory, label] of [[null, "Frontend"], ["server/node", "Backend"]]) {
    try { checkNpm(directory, label); } catch (error) { failures.push(error instanceof Error ? error.message : String(error)); }
  }
  if (failures.length) throw new Error(failures.join("\n"));
  console.log("Dependency security gate passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
