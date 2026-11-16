// Port of Savora.Infrastructure.Media.GeneratedImageFileValidator.
import { createHash, timingSafeEqual } from "node:crypto";
import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { invalidData, throwIfNullOrWhiteSpace } from "../../../domain/dotnet/errors";
import { isNullOrWhiteSpace } from "../../../domain/text";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/** Path.IsPathRooted on Windows: a drive ("C:") or a leading separator. */
function isPathRooted(value: string): boolean {
  return /^[A-Za-z]:/.test(value) || value.startsWith("/") || value.startsWith("\\");
}

function isSafeStorageKey(value: string | null, prefix: string, suffix: string): value is string {
  return (
    !isNullOrWhiteSpace(value) &&
    value!.startsWith(prefix) &&
    value!.endsWith(suffix) &&
    !value!.includes("..") &&
    !value!.includes("\\") &&
    !value!.startsWith("/") &&
    !isPathRooted(value!)
  );
}

function isLowerHex64(value: string | null): value is string {
  return value !== null && value.length === 64 && /^[0-9a-f]{64}$/.test(value);
}

export async function validateGeneratedImage(publicRoot: string | null, storageKey: string | null, expectedSha256: string | null, width: number, height: number): Promise<void> {
  if (!isSafeStorageKey(storageKey, "images/generated/", "-v1.png") || !isLowerHex64(expectedSha256)) {
    throw invalidData("Generated image storage key or SHA-256 is invalid.");
  }
  await validateBoundedImage(publicRoot, storageKey, expectedSha256, width, height, "image/png");
}

export async function validateLicensedLocalImage(publicRoot: string | null, storageKey: string | null, expectedSha256: string | null, width: number, height: number, contentType: string | null): Promise<void> {
  if (!isSafeStorageKey(storageKey, "images/dishes/", ".jpg") || !isLowerHex64(expectedSha256)) {
    throw invalidData("Licensed image storage key or SHA-256 is invalid.");
  }
  await validateBoundedImage(publicRoot, storageKey, expectedSha256, width, height, contentType);
}

export async function validateOwnerApprovedLocalImage(publicRoot: string | null, storageKey: string | null, expectedSha256: string | null, width: number, height: number, contentType: string | null): Promise<void> {
  if (!isSafeStorageKey(storageKey, "images/dishes/", ".png") || !isLowerHex64(expectedSha256)) {
    throw invalidData("Owner-approved image storage key or SHA-256 is invalid.");
  }
  await validateBoundedImage(publicRoot, storageKey, expectedSha256, width, height, contentType);
}

async function validateBoundedImage(
  publicRoot: string | null,
  storageKey: string,
  expectedSha256: string,
  expectedWidth: number,
  expectedHeight: number,
  expectedContentType: string | null,
): Promise<void> {
  throwIfNullOrWhiteSpace(publicRoot, "publicRoot", isNullOrWhiteSpace);
  const root = path.resolve(publicRoot);
  const fullPath = path.resolve(root, storageKey.replaceAll("/", path.sep));
  const relative = path.relative(root, fullPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw invalidData("Generated image resolves outside the public root.");
  }
  let size: number;
  try {
    const info = await stat(fullPath);
    size = info.isFile() ? info.size : -1;
  } catch {
    size = -1;
  }
  if (size < 24 || size > MAX_IMAGE_BYTES) {
    throw invalidData("Generated image is missing or outside the allowed size range.");
  }
  const bytes = await readFile(fullPath);
  let dimensions: { width: number; height: number };
  if (expectedContentType === "image/png") dimensions = readPngDimensions(bytes);
  else if (expectedContentType === "image/jpeg") dimensions = readJpegDimensions(bytes);
  else throw invalidData("Reviewed local image content type is not allowed.");

  const expectedHash = Buffer.from(expectedSha256, "hex");
  const actualHash = createHash("sha256").update(bytes).digest();
  if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight || !timingSafeEqual(expectedHash, actualHash)) {
    throw invalidData("Reviewed local image dimensions or SHA-256 do not match the evidence.");
  }
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPngDimensions(bytes: Buffer): { width: number; height: number } {
  if (
    bytes.length < 24 ||
    !bytes.subarray(0, 8).equals(PNG_SIGNATURE) ||
    bytes.readInt32BE(8) !== 13 ||
    bytes.subarray(12, 16).toString("latin1") !== "IHDR"
  ) {
    throw invalidData("Reviewed local image is not a valid bounded PNG.");
  }
  return { width: bytes.readInt32BE(16), height: bytes.readInt32BE(20) };
}

const START_OF_FRAME = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function readJpegDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 11 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw invalidData("Reviewed local image is not a valid bounded JPEG.");
  }
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset++;
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++]!;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xda || offset + 2 > bytes.length) break;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw invalidData("Reviewed local JPEG contains an invalid segment length.");
    }
    if (START_OF_FRAME.has(marker)) {
      if (segmentLength < 7) throw invalidData("Reviewed local JPEG has an invalid frame header.");
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += segmentLength;
  }
  throw invalidData("Reviewed local JPEG has no supported frame header.");
}
