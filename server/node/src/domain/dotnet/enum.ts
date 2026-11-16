// Enum.TryParse(ignoreCase: false), Enum.IsDefined and Enum.ToString for the int-backed,
// non-[Flags] enums the tools parse. Conformance: test/conformance/dotnet-enum.jsonl.
import { dotnetTrim } from "../text";

export interface DotnetEnum {
  readonly name: string;
  /** Member names in declaration order with their values. */
  readonly members: ReadonlyArray<readonly [string, number]>;
}

export const PUBLICATION_STATUS: DotnetEnum = {
  name: "PublicationStatus",
  members: [["Draft", 0], ["InReview", 1], ["Published", 2], ["Archived", 3]],
};
export const RECIPE_PLACE_RELATION_TYPE: DotnetEnum = {
  name: "RecipePlaceRelationType",
  members: [["Origin", 0], ["RegionalVariation", 1], ["Diaspora", 2], ["DiscoveryAnchor", 3]],
};
export const PLACE_TYPE: DotnetEnum = { name: "PlaceType", members: [["Country", 0], ["Region", 1], ["City", 2]] };
export const MEDIA_RIGHTS_STATUS: DotnetEnum = {
  name: "MediaRightsStatus",
  members: [["Pending", 0], ["Verified", 1], ["Rejected", 2]],
};
export const MEDIA_REVIEW_DECISION_TYPE: DotnetEnum = {
  name: "MediaReviewDecisionType",
  members: [["VisuallyAccepted", 0], ["Rejected", 1], ["ConfirmedNoMatch", 2], ["NeedsReplacement", 3]],
};

const INT32 = /^[+-]?[0-9]+$/;

/** Enum.TryParse(value, ignoreCase: false): returns the parsed value or undefined. */
export function tryParseEnum(type: DotnetEnum, value: string | null | undefined): number | undefined {
  if (value == null) return undefined;
  const trimmed = dotnetTrim(value);
  if (trimmed.length === 0) return undefined;

  const first = trimmed[0]!;
  if ((first >= "0" && first <= "9") || first === "+" || first === "-") {
    if (!INT32.test(trimmed)) return undefined;
    const parsed = Number(trimmed);
    if (parsed < -2147483648 || parsed > 2147483647) return undefined;
    // BigInt check guards against precision loss for very long digit strings.
    const exact = BigInt(trimmed);
    if (exact < -2147483648n || exact > 2147483647n) return undefined;
    return parsed === 0 ? 0 : parsed;
  }

  let result = 0;
  for (const part of trimmed.split(",")) {
    const name = dotnetTrim(part);
    const member = type.members.find(([memberName]) => memberName === name);
    if (member === undefined) return undefined;
    result |= member[1];
  }
  return result;
}

/** Enum.IsDefined(value). */
export function isDefinedEnum(type: DotnetEnum, value: number): boolean {
  return type.members.some(([, memberValue]) => memberValue === value);
}

/** Enum.ToString(): the member name, or the number when undefined. */
export function enumName(type: DotnetEnum, value: number): string {
  return type.members.find(([, memberValue]) => memberValue === value)?.[0] ?? String(value);
}

/** Enum.Parse(value, ignoreCase: false) for a value already validated by TryParse. */
export function parseEnum(type: DotnetEnum, value: string): number {
  const parsed = tryParseEnum(type, value);
  if (parsed === undefined) {
    throw new Error(`Requested value '${value}' was not found.`);
  }
  return parsed;
}
