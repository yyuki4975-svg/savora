// Node port of server/tools/Savora.MethodRepairer.
//   node dist/src/cli/method-repairer.js --package <repair.json> --confirm-repair
import path from "node:path";
import { argumentException, invalidOperation } from "../domain/dotnet/errors";
import { loadMethodRepairPackage, repairMethods } from "../infrastructure/tools/publishing/method-repairer";
import { ToolSession } from "../infrastructure/tools/tool-database";
import { runTool } from "./run-tool";

function parseArguments(argumentsList: string[]): string {
  if (argumentsList.length !== 3 || argumentsList[0] !== "--package" || argumentsList[2] !== "--confirm-repair") {
    throw argumentException("Usage: node server/node/dist/src/cli/method-repairer.js --package <repair.json> --confirm-repair");
  }
  return path.resolve(argumentsList[1]!);
}

void runTool(
  "Method repair failed",
  async () => {
    const packagePath = parseArguments(process.argv.slice(2));
    const connectionString = process.env.SAVORA_DATABASE_URL?.trim();
    if (!connectionString) throw invalidOperation("Set SAVORA_DATABASE_URL before repairing methods.");

    const pkg = await loadMethodRepairPackage(packagePath);
    const session = await ToolSession.open(connectionString);
    try {
      const result = await repairMethods(session, pkg);
      console.log(`Method repair complete. Repaired: ${result.repaired}; already current: ${result.unchanged}; package entries: ${result.entries}.`);
    } finally {
      await session.close();
    }
  },
  { baseMessage: true },
);
