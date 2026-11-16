import { VideoDiscovery } from "../upgrade-experiences";
import { Footer, Header } from "../ui";

export const metadata = { title: "Cooking videos", description: "Credited YouTube cooking videos selected for clarity, relevance, and cultural context." };

export default function VideosPage() { return <main data-website-page><Header /><VideoDiscovery /><Footer /></main>; }

