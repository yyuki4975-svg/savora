import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header } from "../../../ui";
import { RecipeLabel } from "../../../recipe-display-copy";
import { safeSourceUrl } from "../../../recipe-presentation";
import { getRecipe, isCatalogApiEnabled } from "../../../../lib/api/savora-client";

export const metadata = { title: "Recipe source" };

/** Separate credits retain creator/license/source details without crowding the recipe.
 * Attribution reference: https://creativecommons.org/licenses/by-sa/4.0/
 */
export default async function RecipeSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCatalogApiEnabled() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 240) notFound();
  const result = await getRecipe(id, "en");
  if (result.status !== "ok") notFound();
  const recipe = result.data;
  const media = recipe.primaryMedia;
  return <main><Header /><article className="section-shell" style={{ maxWidth: 900, paddingBlock: 64 }}>
    <h1><RecipeLabel name="source" /></h1>
    <p>{recipe.title}</p>
    <section style={{ marginBlock: 40 }}><h2><RecipeLabel name="recipe" /></h2>
      <ul>{recipe.sources.map((source, index) => <li key={index} style={{ marginBlock: 16 }}>
        {safeSourceUrl(source.sourceUrl) ? <a href={safeSourceUrl(source.sourceUrl)} target="_blank" rel="noreferrer">{source.sourceName}</a> : source.sourceName}
        {" · "}{source.licenseCode}
        {source.licenseCode === "CC-BY-SA-4.0" ? <> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></> : null}
      </li>)}</ul>
      {recipe.sources.some(source => source.sourceName === "Wikibooks Cookbook contributors") ? <p><RecipeLabel name="adaptations" /></p> : null}
    </section>
    {media ? <section style={{ marginBlock: 40 }}><h2><RecipeLabel name={media.licenseCode === "OPENAI-OUTPUT" ? "generated" : "image"} /></h2>
      <p>{media.creator}{" · "}{safeSourceUrl(media.licenseUrl) ? <a href={safeSourceUrl(media.licenseUrl)} target="_blank" rel="noreferrer">{media.licenseCode}</a> : media.licenseCode}</p>
      {safeSourceUrl(media.sourceUrl) ? <p><a href={safeSourceUrl(media.sourceUrl)} target="_blank" rel="noreferrer"><RecipeLabel name="originalImage" /></a></p> : null}
      {media.licenseCode !== "OPENAI-OUTPUT" ? <p><RecipeLabel name="resized" /></p> : null}
    </section> : null}
    <Link href={`/recipes/${recipe.slug}`}><RecipeLabel name="back" /></Link>
  </article><Footer /></main>;
}
