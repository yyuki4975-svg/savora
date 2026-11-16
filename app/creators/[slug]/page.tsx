import { CreatorProfile } from "../../kitchen-experiences";
import { Footer, Header } from "../../ui";

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <main data-website-page><Header /><CreatorProfile slug={slug} /><Footer /></main>; }

