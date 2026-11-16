import { PlaceLanding } from "../../kitchen-experiences";
import { Footer, Header } from "../../ui";

export default async function CuisinePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <main data-website-page><Header /><PlaceLanding type="Cuisine" name={slug} /><Footer /></main>; }

