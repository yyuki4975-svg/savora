import { PantryMatcher } from "../kitchen-experiences";
import { Footer, Header } from "../ui";
import { conceptById } from "../../lib/search/pantry-match";

export const metadata = { title: "Cook with what you have" };

// Common first ingredients, sent with their six-language labels so the matcher table stays on the server.
const stapleIds = ["egg", "tomato", "onion", "garlic", "potato", "chicken", "rice", "pasta", "cheese", "milk", "butter", "carrot", "flour", "soy-sauce", "lemon", "tofu"];
const staples = stapleIds.flatMap((id) => { const concept = conceptById.get(id); return concept ? [concept.label] : []; });

export default function PantryPage() { return <main data-website-page><Header /><PantryMatcher staples={staples} /><Footer /></main>; }
