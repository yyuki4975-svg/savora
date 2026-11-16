// Shared entry-point behaviour of the offline tools: success exits 0, any failure prints
// "{prefix}: {message}" to stderr and exits 1, as the C# Program.cs files do.
import { DotnetException } from "../domain/dotnet/errors";

export interface RunToolOptions {
  /** Print Exception.GetBaseException().Message instead of Exception.Message. */
  baseMessage?: boolean;
}

export async function runTool(prefix: string, body: () => Promise<void>, options: RunToolOptions = {}): Promise<void> {
  try {
    await body();
    process.exitCode = 0;
  } catch (error) {
    let message: string;
    if (error instanceof DotnetException) {
      message = options.baseMessage ? error.baseException().message : error.message;
    } else {
      // An unexpected JavaScript error has no C# counterpart; report it plainly.
      message = error instanceof Error ? error.message : String(error);
    }
    console.error(`${prefix}: ${message}`);
    process.exitCode = 1;
  }
}
