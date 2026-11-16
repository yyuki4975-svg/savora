import { Footer, Header } from "../ui";
import { SettingsHome } from "./settings-screens";

export const metadata = { title: "Settings" };

export default function SettingsPage() { return <main><Header /><SettingsHome /><Footer /></main>; }
