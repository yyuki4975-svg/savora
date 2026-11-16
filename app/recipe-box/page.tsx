import { RecipeBox } from "../kitchen-experiences";
import { Footer, Header } from "../ui";
import { KitchenCollections } from '../kitchen-collections';

export const metadata = { title: "My Recipe Box" };

export default function RecipeBoxPage() { return <main data-website-page><Header /><RecipeBox /><KitchenCollections /><Footer /></main>; }

