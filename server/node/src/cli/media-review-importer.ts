// Node port of server/tools/Savora.MediaReviewImporter.
//   node dist/src/cli/media-review-importer.js --review <export.json> [--batch <registered-batch-id>] [--manifest <registered-candidate-manifest.json>]
import path from "node:path";
import { argumentException, invalidData, invalidOperation } from "../domain/dotnet/errors";
import { importMediaReview } from "../infrastructure/tools/media-reviews/media-review-importer";
import {
  DEFAULT_BATCH_ID,
  type RegisteredMediaReviewManifest,
  loadMediaReviewPackage,
  resolveByBatch,
  resolveByPath,
} from "../infrastructure/tools/media-reviews/media-review-package";
import { ToolSession } from "../infrastructure/tools/tool-database";
import { runTool } from "./run-tool";

const usage = () =>
  argumentException(
    "Usage: node server/node/dist/src/cli/media-review-importer.js --review <export.json> " +
      "[--batch <registered-batch-id>] [--manifest <registered-candidate-manifest.json>]",
  );

function parsePaths(argumentsList: string[], repositoryRoot: string): { reviewPath: string; manifestPath: string } {
  let reviewPath: string | undefined;
  let manifestPath: string | undefined;
  let batchId: string | undefined;
  for (let index = 0; index < argumentsList.length; index += 2) {
    if (index + 1 >= argumentsList.length) throw usage();
    const value = argumentsList[index + 1]!;
    switch (argumentsList[index]) {
      case "--review":
        if (reviewPath !== undefined) throw usage();
        reviewPath = value;
        break;
      case "--manifest":
        if (manifestPath !== undefined) throw usage();
        manifestPath = value;
        break;
      case "--batch":
        if (batchId !== undefined) throw usage();
        batchId = value;
        break;
      default:
        throw usage();
    }
  }
  if (reviewPath === undefined) throw usage();

  const dataDirectory = path.join(repositoryRoot, "scripts", "data");
  let registration: RegisteredMediaReviewManifest;
  if (manifestPath === undefined) {
    registration = resolveByBatch(dataDirectory, batchId ?? DEFAULT_BATCH_ID);
  } else {
    registration = resolveByPath(dataDirectory, manifestPath);
    if (batchId !== undefined && batchId !== registration.batchId) {
      throw invalidData("The requested batch does not match the registered candidate manifest path.");
    }
  }
  return { reviewPath: path.resolve(reviewPath), manifestPath: registration.manifestPath };
}

void runTool("Media review import failed", async () => {
  const paths = parsePaths(process.argv.slice(2), process.cwd());
  const connectionString = process.env.SAVORA_DATABASE_URL?.trim();
  if (!connectionString) throw invalidOperation("Set SAVORA_DATABASE_URL in the process environment before importing.");

  const loaded = await loadMediaReviewPackage(paths.reviewPath, paths.manifestPath);
  const session = await ToolSession.open(connectionString);
  try {
    const result = await importMediaReview(session, loaded);
    const outcome = result.added ? "imported" : "already imported";
    console.log(`Media review ${outcome}. Import ID: ${result.importId}; stored decisions: ${result.decisionCount}.`);
  } finally {
    await session.close();
  }
});
