// Node port of server/tools/Savora.GeneratedMediaImporter.
//   node dist/src/cli/generated-media-importer.js --review <review.json> --manifest <manifest.json> --public-root <public-directory>
import path from "node:path";
import { argumentException, invalidOperation } from "../domain/dotnet/errors";
import { importGeneratedMedia } from "../infrastructure/tools/media/generated-media-importer";
import { loadMediaReviewPackage } from "../infrastructure/tools/media-reviews/media-review-package";
import { ToolSession } from "../infrastructure/tools/tool-database";
import { runTool } from "./run-tool";

const usage = () =>
  argumentException(
    "Usage: node server/node/dist/src/cli/generated-media-importer.js " +
      "--review <review.json> --manifest <manifest.json> --public-root <public-directory>",
  );

function parsePaths(argumentsList: string[]): { review: string; manifest: string; publicRoot: string } {
  let review: string | undefined;
  let manifest: string | undefined;
  let publicRoot: string | undefined;
  for (let index = 0; index < argumentsList.length; index += 2) {
    if (index + 1 >= argumentsList.length) throw usage();
    const value = argumentsList[index + 1]!;
    switch (argumentsList[index]) {
      case "--review":
        if (review !== undefined) throw usage();
        review = value;
        break;
      case "--manifest":
        if (manifest !== undefined) throw usage();
        manifest = value;
        break;
      case "--public-root":
        if (publicRoot !== undefined) throw usage();
        publicRoot = value;
        break;
      default:
        throw usage();
    }
  }
  if (review === undefined || manifest === undefined || publicRoot === undefined) throw usage();
  return { review: path.resolve(review), manifest: path.resolve(manifest), publicRoot: path.resolve(publicRoot) };
}

void runTool("Reviewed media import failed", async () => {
  const paths = parsePaths(process.argv.slice(2));
  const connectionString = process.env.SAVORA_DATABASE_URL?.trim();
  if (!connectionString) throw invalidOperation("Set SAVORA_DATABASE_URL before importing.");

  const loaded = await loadMediaReviewPackage(paths.review, paths.manifest);
  const session = await ToolSession.open(connectionString);
  try {
    const result = await importGeneratedMedia(session, loaded, paths.publicRoot);
    console.log(
      `Reviewed media import complete. Added: ${result.assetsAdded}; ` +
        `already present: ${result.assetsAlreadyPresent}; primary links changed: ${result.primaryAssociationsChanged}.`,
    );
  } finally {
    await session.close();
  }
});
