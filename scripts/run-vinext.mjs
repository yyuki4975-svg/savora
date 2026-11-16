import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkBracesPatch } from "./dependency-patches/braces-depth.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [requestedCommand, ...commandArguments] = process.argv.slice(2);
const command=requestedCommand==='dev:accounts' ? 'dev' : requestedCommand;
const allowedCommands = new Set(["dev", "build", "start"]);

if (!allowedCommands.has(command)) {
  console.error("Usage: node scripts/run-vinext.mjs <dev|build|start> [arguments]");
  process.exitCode = 64;
} else {
  checkBracesPatch();
  const cliPath = path.join(repositoryRoot, "node_modules", "vinext", "dist", "cli.js");
  const nodeEnvironment = command === "dev" ? "development" : "production";
  const accountPreview=requestedCommand==='dev:accounts' ? {
    SAVORA_ACCOUNT_API_ENABLED:'true',SAVORA_ACCOUNT_API_BASE_URL:'http://localhost:5094',SAVORA_ACCOUNT_WEB_ORIGIN:'http://localhost:5173',
    SAVORA_ACCOUNT_MAIL_DELIVERY_READY:'false',SAVORA_CATALOG_API_ENABLED:'true',SAVORA_API_BASE_URL:'http://localhost:5094',SAVORA_DRAFT_CATALOG_ENABLED:'false',
  } : {};
  const child = spawn(process.execPath, [cliPath, command, ...commandArguments], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      ...accountPreview,
      NODE_ENV: nodeEnvironment,
      WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
    },
    shell: false,
    stdio: "inherit",
    windowsHide: true,
  });

  child.once("error", (error) => {
    console.error(`Unable to start Vinext: ${error.message}`);
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    if (signal) {
      console.error(`Vinext stopped by signal ${signal}.`);
      process.exitCode = 1;
      return;
    }
    process.exitCode = code ?? 1;
  });
}
