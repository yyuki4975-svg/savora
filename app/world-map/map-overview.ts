// Header, directory and the original z0/z1 tiles from the pinned PMTiles archive.
export const MAP_OVERVIEW_URL = "/maps/savora-overview-4470ed328f6daebee113d990812de6748cec649566e09929d32e5469a01883e8.bin";
export const MAP_OVERVIEW_BYTES = 286514;
export const MAP_OVERVIEW_INTEGRITY = "sha256-RHDtMo9trr7hE9mQgS3mdIzsZJVm4Jkp0y5UaaAYg+g=";

export async function loadMapOverview(): Promise<ArrayBuffer | undefined> {
  try {
    const response = await fetch(MAP_OVERVIEW_URL, {
      cache: "force-cache",
      integrity: MAP_OVERVIEW_INTEGRITY,
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return undefined;
    const bytes = await response.arrayBuffer();
    return bytes.byteLength === MAP_OVERVIEW_BYTES ? bytes : undefined;
  } catch {
    // The original ranged archive remains available if the overview cannot load.
    return undefined;
  }
}
