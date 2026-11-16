// Port of Savora.Domain.Geography (Place, PlaceName).
import { argumentException, argumentOutOfRangeException, invalidOperation } from "../dotnet/errors";
import { createVersion7 } from "../dotnet/guid";
import { isNullOrWhiteSpace, requireLocale, requireSlug, requireText } from "../text";

export type PlaceType = "Country" | "Region" | "City";

export class PlaceName {
  constructor(
    readonly id: string,
    readonly placeId: string,
    readonly locale: string,
    readonly name: string,
  ) {}
}

export class Place {
  isNew = false;
  readonly names: PlaceName[] = [];

  constructor(
    readonly id: string,
    readonly slug: string,
    readonly type: PlaceType,
    readonly latitude: number | null,
    readonly longitude: number | null,
    readonly wikidataId: string | null,
  ) {}

  /** Comparisons with NaN are false in both languages, so NaN passes these checks as it does in C#. */
  static create(
    slug: string,
    type: PlaceType,
    latitude: number | null = null,
    longitude: number | null = null,
    wikidataId: string | null = null,
    id?: string,
  ): Place {
    if (latitude !== null && (latitude < -90 || latitude > 90)) throw argumentOutOfRangeException("latitude");
    if (longitude !== null && (longitude < -180 || longitude > 180)) throw argumentOutOfRangeException("longitude");
    if ((latitude === null) !== (longitude === null)) {
      throw argumentException("Latitude and longitude must be provided together.");
    }
    const place = new Place(
      id ?? createVersion7(),
      requireSlug(slug),
      type,
      latitude,
      longitude,
      isNullOrWhiteSpace(wikidataId) ? null : requireText(wikidataId, 32, "wikidataId"),
    );
    place.isNew = true;
    return place;
  }

  addName(locale: string, name: string): PlaceName {
    const normalizedLocale = requireLocale(locale);
    if (this.names.some((candidate) => candidate.locale === normalizedLocale)) {
      throw invalidOperation(`Place name '${normalizedLocale}' already exists.`);
    }
    const placeName = new PlaceName(createVersion7(), this.id, normalizedLocale, requireText(name, 240, "name"));
    this.names.push(placeName);
    return placeName;
  }
}
