// File access with the exception shapes System.IO produces for missing files and folders.
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DotnetException } from "../../domain/dotnet/errors";

/** Path.GetFullPath relative to the current directory. */
export function getFullPath(value: string): string {
  return path.resolve(value);
}

/** File.ReadAllBytesAsync: FileNotFoundException / DirectoryNotFoundException like .NET. */
export async function readAllBytes(fullPath: string): Promise<Buffer> {
  try {
    return await readFile(fullPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      const directory = path.dirname(fullPath);
      if (!existsSync(directory) || !statSync(directory).isDirectory()) {
        throw new DotnetException("System.IO.DirectoryNotFoundException", `Could not find a part of the path '${fullPath}'.`);
      }
      throw new DotnetException("System.IO.FileNotFoundException", `Could not find file '${fullPath}'.`);
    }
    throw error;
  }
}
