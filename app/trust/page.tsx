import Link from "next/link";
import { Footer, Header } from "../ui";
import styles from "./trust.module.css";

export const metadata = { title: "Trust & safety", description: "How Savora reviews recipes, credits sources and photographs, handles cultural claims and food safety, and keeps the community respectful." };

// Describes what the site actually does today. No statistics: review volumes and response
// times are not published until they can be measured.
const sections = [
  { id: "review", title: "How recipes are reviewed", points: [
    "Every shared recipe is read by an editor before it is published. Nothing goes live automatically.",
    "Editors check the method, the sources, any cultural claims, the rights to each photograph, and photo quality.",
    "If something needs changing, the recipe goes back to its contributor with the reason.",
  ] },
  { id: "credit", title: "Credit and copyright", points: [
    "Recipes link to the sources they come from. Photographs carry their author and licence.",
    "Only share photographs you took yourself or have permission to use.",
    "If your work appears without credit, report it and it will be corrected or removed.",
  ] },
  { id: "culture", title: "Cultural accuracy", points: [
    "Savora distinguishes regional dishes, diaspora versions and modern adaptations.",
    "Claims such as “the national dish” or “the original recipe” need a source.",
    "A contributor’s own context is kept, not quietly rewritten.",
  ] },
  { id: "safety", title: "Food safety", points: [
    "Methods with unsafe cooking temperatures or storage are corrected before publication.",
    "Safety notes follow widely published food-safety guidance.",
  ] },
  { id: "community", title: "Community guidelines", points: [
    "Be kind, even when you disagree about how a dish should be made.",
    "No harassment, hate, spam or promotional links.",
    "Keep personal information, yours and other people’s, out of posts.",
  ] },
  { id: "reporting", title: "Reporting a problem", points: [
    "Open the options menu on any community post and send a report. Moderators review every report.",
    "Reports are judged against these guidelines, and repeated breaches can lead to removal.",
  ] },
  { id: "privacy", title: "Your privacy", points: [
    "Drafts, private notes and community posts are never sent to automatic translation.",
    "Signed-out saves and notes stay in your browser until you import them into an account.",
  ] },
];

export default function TrustPage() {
  return (
    <main data-website-page>
      <Header />
      <div className={styles.page}>
        <h1>Trust & safety</h1>
        <p className={styles.lead}>How Savora keeps recipes accurate, credited and safe to cook.</p>
        <nav className={styles.toc} aria-label="On this page">
          {sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}
        </nav>
        {sections.map((section) => (
          <section className={styles.section} id={section.id} aria-labelledby={`${section.id}-title`} key={section.id}>
            <h2 id={`${section.id}-title`}>{section.title}</h2>
            <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
          </section>
        ))}
        <p className={styles.more}><Link href="/community">Community</Link><Link href="/share">Share a recipe</Link></p>
      </div>
      <Footer />
    </main>
  );
}
