// Node port of server/tools/Savora.RecipePublisher.
//   node dist/src/cli/recipe-publisher.js --package <reviewed-publication.json> [--public-root <public-directory>] --confirm-publish
import path from "node:path";
import { argumentException, invalidOperation } from "../domain/dotnet/errors";
import { isNullOrWhiteSpace } from "../domain/text";
import { loadRecipePublicationPackage } from "../infrastructure/tools/publishing/recipe-publication-package";
import { publishRecipe } from "../infrastructure/tools/publishing/recipe-publisher";
import { ToolSession } from "../infrastructure/tools/tool-database";
import { runTool } from "./run-tool";

function parseArguments(argumentsList: string[]): { packagePath: string; publicRoot: string | null } {
  if (
    (argumentsList.length !== 3 && argumentsList.length !== 5) ||
    argumentsList[0] !== "--package" ||
    isNullOrWhiteSpace(argumentsList[1]) ||
    argumentsList[argumentsList.length - 1] !== "--confirm-publish" ||
    (argumentsList.length === 5 && (argumentsList[2] !== "--public-root" || isNullOrWhiteSpace(argumentsList[3])))
  ) {
    throw argumentException(
      "Usage: node server/node/dist/src/cli/recipe-publisher.js --package <reviewed-publication.json> " +
        "[--public-root <public-directory>] --confirm-publish",
    );
  }
  return {
    packagePath: path.resolve(argumentsList[1]!),
    publicRoot: argumentsList.length === 5 ? path.resolve(argumentsList[3]!) : null,
  };
}

void runTool(
  "Recipe publication failed",
  async () => {
    const paths = parseArguments(process.argv.slice(2));
    const connectionString = process.env.SAVORA_DATABASE_URL?.trim();
    if (!connectionString) throw invalidOperation("Set SAVORA_DATABASE_URL in the process environment before publishing.");

    const loaded = await loadRecipePublicationPackage(paths.packagePath, paths.publicRoot);
    const session = await ToolSession.open(connectionString);
    try {
      const pending = await session.pendingMigrations();
      if (pending.length > 0) {
        throw invalidOperation(`Apply the reviewed database migrations before publishing (${pending.length} pending).`);
      }
      const result = await publishRecipe(session, loaded);
      const outcome = result.added ? "published" : "already published from this immutable package";
      console.log(
        `Recipe ${outcome}. Recipe ID: ${result.recipeId}; version: ${result.versionNumber}; ` +
          `audit ID: ${result.auditId}; payload SHA-256: ${loaded.PayloadSha256}.`,
      );
    } finally {
      await session.close();
    }
  },
  { baseMessage: true },
);
