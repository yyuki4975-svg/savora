// Port of Savora.Domain.Media.MediaAsset.
import { argumentException, argumentOutOfRangeException, invalidOperation } from "../dotnet/errors";
import { EMPTY_GUID, createVersion7 } from "../dotnet/guid";
import type { Instant } from "../dotnet/instant";
import { httpsUriFacts } from "../dotnet/uri";
import { isNullOrWhiteSpace, requireText } from "../text";

export type MediaRightsStatus = "Pending" | "Verified" | "Rejected";
const RIGHTS: readonly MediaRightsStatus[] = ["Pending", "Verified", "Rejected"];

/** MediaAsset.RequireHttpsUrl: trimmed, at most 2048, absolute https without user info; stored as AbsoluteUri. */
export function requireHttpsUrl(value: string | null | undefined, parameterName: string): string {
  const normalized = requireText(value, 2048, parameterName);
  const uri = httpsUriFacts(normalized);
  if (!uri.https || uri.userInfo.length > 0) {
    throw argumentException("URL must be an absolute HTTPS URL without credentials.", parameterName);
  }
  return uri.absoluteUri;
}

export class MediaAsset {
  isNew = false;
  modified = false;

  constructor(
    readonly id: string,
    readonly storageKey: string | null,
    readonly contentType: string,
    readonly altText: string,
    readonly creator: string,
    readonly licenseCode: string,
    readonly licenseUrl: string,
    readonly provider: string,
    readonly externalId: string,
    readonly sourceUrl: string | null,
    readonly width: number | null,
    readonly height: number | null,
    public rightsStatus: MediaRightsStatus,
    readonly createdAt: Instant,
  ) {}

  static register(
    storageKey: string,
    contentType: string,
    altText: string,
    creator: string,
    licenseCode: string,
    licenseUrl: string,
    provider: string,
    externalId: string,
    sourceUrl: string | null,
    width: number,
    height: number,
    rightsStatus: MediaRightsStatus,
    createdAt: Instant,
  ): MediaAsset {
    if (!RIGHTS.includes(rightsStatus)) throw argumentOutOfRangeException("rightsStatus");
    if (width < 1 || width > 32768) throw argumentOutOfRangeException("width", "Width must be between 1 and 32768 pixels.");
    if (height < 1 || height > 32768) throw argumentOutOfRangeException("height", "Height must be between 1 and 32768 pixels.");
    const asset = new MediaAsset(
      createVersion7(),
      requireText(storageKey, 1024, "storageKey"),
      requireText(contentType, 120, "contentType"),
      requireText(altText, 1000, "altText"),
      requireText(creator, 240, "creator"),
      requireText(licenseCode, 80, "licenseCode"),
      requireHttpsUrl(licenseUrl, "licenseUrl"),
      requireText(provider, 120, "provider"),
      requireText(externalId, 240, "externalId"),
      isNullOrWhiteSpace(sourceUrl) ? null : requireHttpsUrl(sourceUrl, "sourceUrl"),
      width,
      height,
      rightsStatus,
      createdAt,
    );
    asset.isNew = true;
    return asset;
  }

  static registerExternalReference(
    id: string,
    contentType: string,
    altText: string,
    creator: string,
    licenseCode: string,
    licenseUrl: string,
    provider: string,
    externalId: string,
    sourceUrl: string,
    width: number | null,
    height: number | null,
    rightsStatus: MediaRightsStatus,
    createdAt: Instant,
  ): MediaAsset {
    if (id === EMPTY_GUID) throw argumentException("Media asset ID is required.", "id");
    if (!RIGHTS.includes(rightsStatus)) throw argumentOutOfRangeException("rightsStatus");
    if (
      (width === null) !== (height === null) ||
      (width !== null && (width < 1 || width > 32768)) ||
      (height !== null && (height < 1 || height > 32768))
    ) {
      throw argumentOutOfRangeException("width", "Dimensions must be a complete pair between 1 and 32768 pixels.");
    }
    const asset = new MediaAsset(
      id,
      null,
      requireText(contentType, 120, "contentType"),
      requireText(altText, 1000, "altText"),
      requireText(creator, 240, "creator"),
      requireText(licenseCode, 80, "licenseCode"),
      requireHttpsUrl(licenseUrl, "licenseUrl"),
      requireText(provider, 120, "provider"),
      requireText(externalId, 240, "externalId"),
      requireHttpsUrl(sourceUrl, "sourceUrl"),
      width,
      height,
      rightsStatus,
      createdAt,
    );
    asset.isNew = true;
    return asset;
  }

  verifyRights(): void {
    if (this.rightsStatus === "Rejected") throw invalidOperation("Rejected media cannot be promoted to Verified.");
    if (this.rightsStatus !== "Verified") this.modified = true;
    this.rightsStatus = "Verified";
  }
}
