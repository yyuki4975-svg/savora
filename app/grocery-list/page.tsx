import { GroceryList } from "../kitchen-experiences";
import { Footer, Header } from "../ui";

export const metadata = { title: "Grocery list" };

export default function GroceryListPage() { return <main data-website-page><Header /><GroceryList /><Footer /></main>; }

