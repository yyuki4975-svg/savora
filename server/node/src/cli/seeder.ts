// Node port of server/tools/Savora.Seeder.
//   node dist/src/cli/seeder.js [--package <directory>]
// Reads SAVORA_DATABASE_URL (the C# tool reads ConnectionStrings__SavoraDatabase).
import path from "node:path";
import { argumentException, invalidOperation } from "../domain/dotnet/errors";
import { importCatalogSeed } from "../infrastructure/tools/seeding/catalog-seed-importer";
import { loadCatalogSeedPackage } from "../infrastructure/tools/seeding/catalog-seed-package";
import { ToolSession } from "../infrastructure/tools/tool-database";
import { runTool } from "./run-tool";

function parsePackageDirectory(argumentsList: string[]): string {
  if (argumentsList.length === 0) return path.resolve(process.cwd(), "server", "seed", "catalog", "v1");
  if (argumentsList.length === 2 && argumentsList[0] === "--package") return path.resolve(argumentsList[1]!);
  throw argumentException("Usage: node server/node/dist/src/cli/seeder.js [--package <directory>]");
}

void runTool("Catalog seed failed", async () => {
  const packageDirectory = parsePackageDirectory(process.argv.slice(2));
  const connectionString = process.env.SAVORA_DATABASE_URL?.trim();
  if (!connectionString) {
    throw invalidOperation("Set SAVORA_DATABASE_URL in the process environment before running the seeder.");
  }

  const loaded = await loadCatalogSeedPackage(packageDirectory);
  const session = await ToolSession.open(connectionString);
  try {
    const result = await importCatalogSeed(session, loaded.Payload);
    console.log(
      `Seed '${loaded.Manifest.SeedId}' verified and imported. ` +
        `Recipes: ${result.recipesAdded} added, ${result.recipesSkipped} unchanged. ` +
        `Places: ${result.placesAdded} added, ${result.placesSkipped} unchanged. ` +
        `Recipe-place associations: ${result.associationsAdded} added. ` +
        `Media assets: ${result.mediaAssetsAdded} added, ${result.mediaAssetsSkipped} unchanged. ` +
        `Recipe-media associations: ${result.mediaAssociationsAdded} added.`,
    );
  } finally {
    await session.close();
  }
});
