import { Footer, Header } from "../ui";
import { SkillsExperience } from "./skills-experience";

export const metadata = { title: "Kitchen skills", description: "Learn knife work, heat control, flavour, bread, preserving and drinks, one skill at a time, from the tools on a modern kitchen wall." };

export default function SkillsPage() { return <main><Header /><SkillsExperience /><Footer /></main>; }
