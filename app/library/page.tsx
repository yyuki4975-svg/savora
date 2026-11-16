import { AssetLibrary } from "../upgrade-experiences";
import { Footer, Header } from "../ui";
import { requireLocalReview } from "../internal-only";

export const metadata = { title: "Food Asset Library", description: "Manage credited food imagery, responsive assets, alt text, and YouTube embeds." };

export default function LibraryPage() { requireLocalReview(); return <main data-website-page><Header /><AssetLibrary /><Footer /></main>; }

