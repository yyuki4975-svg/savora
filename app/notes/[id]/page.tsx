import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityNoteView } from "../../community-note-view";
import { createCommunityRecipeNote, getSocialRecipeById } from "../../social-recipe-data";
import { Footer, Header } from "../../ui";

type NotePageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ area?: string; dish?: string }> };

async function resolveNote({ params, searchParams }: NotePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const stored = getSocialRecipeById(id);
  if (stored) return stored;
  if (id === "map-note" && query.area?.trim() && query.dish?.trim()) {
    return createCommunityRecipeNote(query.area.trim().slice(0, 80), query.dish.trim().slice(0, 120));
  }
  return undefined;
}

export async function generateMetadata(props: NotePageProps): Promise<Metadata> {
  const note = await resolveNote(props);
  return note
    ? { title: `${note.name} community note | Savora`, description: note.summary }
    : { title: "Community note | Savora" };
}

export default async function CommunityNotePage(props: NotePageProps) {
  const note = await resolveNote(props);
  if (!note) notFound();

  return <main><Header /><CommunityNoteView note={note} /><Footer /></main>;
}
