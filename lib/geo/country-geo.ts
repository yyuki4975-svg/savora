// Approximate country centres for map placement, from Google's public DSPL "countries.csv"
// dataset (https://developers.google.com/public-data/docs/canonical/countries_csv), rounded to
// two decimals. They mark where a country's recipes gather on the map; they are not origin claims.
// Regions are Savora's editorial grouping for indexes.

export type CountryRegion = "Europe" | "Middle East" | "Africa" | "Asia" | "The Americas" | "Oceania";

export const countryRegionOrder: Array<CountryRegion | "More places"> = ["Europe", "Middle East", "Africa", "Asia", "The Americas", "Oceania", "More places"];

type CountryGeo = { lat: number; lng: number; region: CountryRegion; flag: string };

export const countryGeo: Record<string, CountryGeo> = {
  Algeria: { lat: 28.03, lng: 1.66, region: "Africa", flag: "🇩🇿" },
  Argentina: { lat: -38.42, lng: -63.62, region: "The Americas", flag: "🇦🇷" },
  Australia: { lat: -25.27, lng: 133.78, region: "Oceania", flag: "🇦🇺" },
  Austria: { lat: 47.52, lng: 14.55, region: "Europe", flag: "🇦🇹" },
  Bangladesh: { lat: 23.68, lng: 90.36, region: "Asia", flag: "🇧🇩" },
  Belgium: { lat: 50.5, lng: 4.47, region: "Europe", flag: "🇧🇪" },
  Brazil: { lat: -14.24, lng: -51.93, region: "The Americas", flag: "🇧🇷" },
  Canada: { lat: 56.13, lng: -106.35, region: "The Americas", flag: "🇨🇦" },
  Chile: { lat: -35.68, lng: -71.54, region: "The Americas", flag: "🇨🇱" },
  China: { lat: 35.86, lng: 104.2, region: "Asia", flag: "🇨🇳" },
  Colombia: { lat: 4.57, lng: -74.3, region: "The Americas", flag: "🇨🇴" },
  Croatia: { lat: 45.1, lng: 15.2, region: "Europe", flag: "🇭🇷" },
  Cuba: { lat: 21.52, lng: -77.78, region: "The Americas", flag: "🇨🇺" },
  Denmark: { lat: 56.26, lng: 9.5, region: "Europe", flag: "🇩🇰" },
  Egypt: { lat: 26.82, lng: 30.8, region: "Africa", flag: "🇪🇬" },
  Ethiopia: { lat: 9.15, lng: 40.49, region: "Africa", flag: "🇪🇹" },
  France: { lat: 46.23, lng: 2.21, region: "Europe", flag: "🇫🇷" },
  Germany: { lat: 51.17, lng: 10.45, region: "Europe", flag: "🇩🇪" },
  Ghana: { lat: 7.95, lng: -1.02, region: "Africa", flag: "🇬🇭" },
  Greece: { lat: 39.07, lng: 21.82, region: "Europe", flag: "🇬🇷" },
  Hungary: { lat: 47.16, lng: 19.5, region: "Europe", flag: "🇭🇺" },
  India: { lat: 20.59, lng: 78.96, region: "Asia", flag: "🇮🇳" },
  Indonesia: { lat: -0.79, lng: 113.92, region: "Asia", flag: "🇮🇩" },
  Iran: { lat: 32.43, lng: 53.69, region: "Middle East", flag: "🇮🇷" },
  Ireland: { lat: 53.41, lng: -8.24, region: "Europe", flag: "🇮🇪" },
  Israel: { lat: 31.05, lng: 34.85, region: "Middle East", flag: "🇮🇱" },
  Italy: { lat: 41.87, lng: 12.57, region: "Europe", flag: "🇮🇹" },
  Jamaica: { lat: 18.11, lng: -77.3, region: "The Americas", flag: "🇯🇲" },
  Japan: { lat: 36.2, lng: 138.25, region: "Asia", flag: "🇯🇵" },
  Kenya: { lat: -0.02, lng: 37.91, region: "Africa", flag: "🇰🇪" },
  Lebanon: { lat: 33.85, lng: 35.86, region: "Middle East", flag: "🇱🇧" },
  Malaysia: { lat: 4.21, lng: 101.98, region: "Asia", flag: "🇲🇾" },
  Mexico: { lat: 23.63, lng: -102.55, region: "The Americas", flag: "🇲🇽" },
  Morocco: { lat: 31.79, lng: -7.09, region: "Africa", flag: "🇲🇦" },
  Nepal: { lat: 28.39, lng: 84.12, region: "Asia", flag: "🇳🇵" },
  Netherlands: { lat: 52.13, lng: 5.29, region: "Europe", flag: "🇳🇱" },
  "New Zealand": { lat: -40.9, lng: 174.89, region: "Oceania", flag: "🇳🇿" },
  Nigeria: { lat: 9.08, lng: 8.68, region: "Africa", flag: "🇳🇬" },
  Norway: { lat: 60.47, lng: 8.47, region: "Europe", flag: "🇳🇴" },
  Pakistan: { lat: 30.38, lng: 69.35, region: "Asia", flag: "🇵🇰" },
  Peru: { lat: -9.19, lng: -75.02, region: "The Americas", flag: "🇵🇪" },
  Philippines: { lat: 12.88, lng: 121.77, region: "Asia", flag: "🇵🇭" },
  Poland: { lat: 51.92, lng: 19.15, region: "Europe", flag: "🇵🇱" },
  Portugal: { lat: 39.4, lng: -8.22, region: "Europe", flag: "🇵🇹" },
  Russia: { lat: 61.52, lng: 105.32, region: "Europe", flag: "🇷🇺" },
  "Saudi Arabia": { lat: 23.89, lng: 45.08, region: "Middle East", flag: "🇸🇦" },
  Singapore: { lat: 1.35, lng: 103.82, region: "Asia", flag: "🇸🇬" },
  Slovakia: { lat: 48.67, lng: 19.7, region: "Europe", flag: "🇸🇰" },
  "South Africa": { lat: -30.56, lng: 22.94, region: "Africa", flag: "🇿🇦" },
  "South Korea": { lat: 35.91, lng: 127.77, region: "Asia", flag: "🇰🇷" },
  Spain: { lat: 40.46, lng: -3.75, region: "Europe", flag: "🇪🇸" },
  "Sri Lanka": { lat: 7.87, lng: 80.77, region: "Asia", flag: "🇱🇰" },
  Sweden: { lat: 60.13, lng: 18.64, region: "Europe", flag: "🇸🇪" },
  Switzerland: { lat: 46.82, lng: 8.23, region: "Europe", flag: "🇨🇭" },
  Syria: { lat: 34.8, lng: 38.99, region: "Middle East", flag: "🇸🇾" },
  Thailand: { lat: 15.87, lng: 100.99, region: "Asia", flag: "🇹🇭" },
  Tunisia: { lat: 33.89, lng: 9.54, region: "Africa", flag: "🇹🇳" },
  "Türkiye": { lat: 38.96, lng: 35.24, region: "Middle East", flag: "🇹🇷" },
  Ukraine: { lat: 48.38, lng: 31.17, region: "Europe", flag: "🇺🇦" },
  "United Kingdom": { lat: 55.38, lng: -3.44, region: "Europe", flag: "🇬🇧" },
  "United States": { lat: 37.09, lng: -95.71, region: "The Americas", flag: "🇺🇸" },
  Uruguay: { lat: -32.52, lng: -55.77, region: "The Americas", flag: "🇺🇾" },
  Venezuela: { lat: 6.42, lng: -66.59, region: "The Americas", flag: "🇻🇪" },
  Vietnam: { lat: 14.06, lng: 108.28, region: "Asia", flag: "🇻🇳" },
};

export function countryRegion(name: string): CountryRegion | "More places" {
  return countryGeo[name]?.region ?? "More places";
}
