import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { requireReady } from "../../application/submissions/submissions";
import type { PublicationInput, PublicationStore } from "../../application/submissions/publication";
import type { SubmissionContent } from "../../contracts/submissions";
import { ProductError } from "../../domain/product-error";
import { productWrite } from "./product-write";
import { tokenHash } from "./crypto";
export class PgSubmissionPublication implements PublicationStore {
  constructor(private readonly pool: Pool) {}
  publish(actor: string, id: string, input: PublicationInput, key: string) {
    return productWrite(this.pool, actor, "ReviewRecipe", `submission:publish:${id}`, key, input, async client => {
      const row = (await client.query<{ owner_id: string; reviewer_id: string | null; state: string; revision: number; version: number; content: SubmissionContent }>(
        "SELECT owner_id,reviewer_id,state,revision,version,content FROM savora_product.submissions WHERE id=$1 FOR UPDATE", [id])).rows[0];
      if (!row) throw new ProductError(404, "SubmissionNotFound", "Submission not found.");
      if (row.owner_id === actor || row.reviewer_id !== actor) throw new ProductError(403, "ReviewOwner", "Only the assigned, independent editor may publish.");
      if (row.state !== "Approved" || row.revision !== input.expectedRevision || row.revision >= 2147483647)
        throw new ProductError(409, "RevisionConflict", "Refresh the approved submission before publishing.");
      if ((await client.query("SELECT 1 FROM savora_product.submission_publications WHERE submission_id=$1", [id])).rowCount)
        throw new ProductError(409, "AlreadyPublished", "This submission already has a publication.");
      const snapshot = (await client.query<{ content: SubmissionContent }>("SELECT content FROM savora_product.submission_versions WHERE submission_id=$1 AND version=$2", [id, row.version])).rows[0]?.content;
      if (!snapshot || JSON.stringify(snapshot) !== JSON.stringify(row.content)) throw new ProductError(409, "SnapshotChanged", "The approved snapshot changed.");
      requireReady(snapshot);
      const annotations = snapshot.details ? Object.entries(snapshot.details).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join('\n') : '';
      const culturalNote = [snapshot.story,annotations].filter(Boolean).join('\n\n');
      if (culturalNote.length > 8000) throw new ProductError(422, 'PublicationContentTooLarge', 'Shorten the context or source annotations before publication.');
      const place = (await client.query<{ id: string }>("SELECT id FROM public.places WHERE slug=$1", [input.placeSlug])).rows[0];
      if (!place) throw new ProductError(422, "InvalidPlace", "Select an existing catalog place.");
      // No URL fetching, upload handler or unreviewed image fallback. Rights must already be verified.
      const media = (await client.query("SELECT id FROM public.media_assets WHERE id=$1 AND rights_status='Verified' FOR SHARE", [input.mediaAssetId])).rows[0];
      if (!media) throw new ProductError(422, "VerifiedMediaRequired", "A matching rights-verified image is required.");
      const recipeId = randomUUID(), versionId = randomUUID();
      const inserted = await client.query(`INSERT INTO public.recipes(id,slug,status,created_at,updated_at)
        VALUES($1,$2,'Draft',now(),now()) ON CONFLICT(slug) DO NOTHING RETURNING id`, [recipeId, input.recipeSlug]);
      if (!inserted.rowCount) throw new ProductError(409, "RecipeSlugTaken", "Choose another recipe slug.");
      await client.query(`INSERT INTO public.recipe_versions(id,recipe_id,version_number,original_locale,servings,created_at)
        VALUES($1,$2,1,$3,$4,now())`, [versionId, recipeId, snapshot.locale, snapshot.servings]);
      await client.query(`INSERT INTO public.recipe_translations(id,recipe_version_id,locale,title,summary,cultural_note,is_machine_translated)
        VALUES($1,$2,$3,$4,$5,$6,false)`, [randomUUID(), versionId, snapshot.locale, snapshot.title, snapshot.story.slice(0, 2000), culturalNote]);
      for (const [index, line] of snapshot.ingredients.entries()) await client.query(`INSERT INTO public.recipe_ingredient_lines(id,recipe_version_id,position,name,preparation_note)
        VALUES($1,$2,$3,$4,$5)`, [randomUUID(), versionId, index + 1, line.name, line.quantity]);
      // Authored quantity text is retained exactly, not guessed into numeric/unit columns.
      for (const [index, instruction] of snapshot.steps.entries()) await client.query(`INSERT INTO public.recipe_steps(id,recipe_version_id,position,instruction)
        VALUES($1,$2,$3,$4)`, [randomUUID(), versionId, index + 1, instruction]);
      const name = (await client.query<{ display_name: string }>("SELECT display_name FROM savora_product.accounts WHERE id=$1", [row.owner_id])).rows[0]!.display_name;
      for (const source of snapshot.sources) await client.query(`INSERT INTO public.source_attributions(id,recipe_version_id,source_url,source_name,license_code,retrieved_at,external_id)
        VALUES($1,$2,$3,$4,'ContributorDeclaration',now(),$5)`, [randomUUID(), versionId, source, 'Contributor-cited source (see authored source notes)', id]);
      await client.query(`INSERT INTO public.source_attributions(id,recipe_version_id,source_url,source_name,license_code,retrieved_at,external_id)
        VALUES($1,$2,$3,$4,'ContributorDeclaration',now(),$5)`, [randomUUID(), versionId, `https://www.cookwsavora.com/recipes/${input.recipeSlug}`, `Recipe contributed by ${name}`.slice(0,240), id]);
      await client.query("INSERT INTO public.recipe_place_associations(recipe_id,place_id,relation_type,is_primary) VALUES($1,$2,'Origin',true)", [recipeId, place.id]);
      await client.query("INSERT INTO public.recipe_media_associations(recipe_id,media_asset_id,position,is_primary) VALUES($1,$2,1,true)", [recipeId, input.mediaAssetId]);
      await client.query(`UPDATE public.recipes SET current_version_id=$2,status='Published',published_at=now(),updated_at=now() WHERE id=$1`, [recipeId, versionId]);
      await client.query(`INSERT INTO public.recipe_publication_audits(id,recipe_id,recipe_version_id,based_on_version,from_status,to_status,payload_sha256,reviewed_by,review_note,media_policy,approved_at,recorded_at)
        VALUES($1,$2,$3,1,'Draft','Published',$4,$5,$6,'VerifiedPrimaryRequired',now(),now())`,
        [randomUUID(), recipeId, versionId, tokenHash(JSON.stringify({ submissionId: id, version: row.version, input, content: snapshot })), actor, input.reason]);
      await client.query(`INSERT INTO savora_product.submission_publications(submission_id,version,recipe_id,published_by) VALUES($1,$2,$3,$4)`, [id, row.version, recipeId, actor]);
      await client.query("UPDATE savora_product.submissions SET revision=revision+1,updated_at=now() WHERE id=$1", [id]);
      await client.query(`INSERT INTO savora_product.submission_events(submission_id,revision,actor_id,from_state,to_state,reason)
        VALUES($1,$2,$3,'Approved','Approved',$4)`, [id, row.revision + 1, actor, `Published: ${input.recipeSlug}. ${input.reason}`.slice(0, 2000)]);
      return { recipeSlug: input.recipeSlug, submissionId: id, published: true as const };
    });
  }
  withdraw(actor: string, id: string, revision: number, reason: string, key: string) {
    return productWrite(this.pool, actor, "Contribute", `submission:withdraw:${id}`, key, { revision, reason }, async client => {
      const row = (await client.query<{ revision: number; state: string }>("SELECT revision,state FROM savora_product.submissions WHERE id=$1 AND owner_id=$2 FOR UPDATE", [id, actor])).rows[0];
      if (!row) throw new ProductError(404, "SubmissionNotFound", "Submission not found.");
      if (row.revision !== revision || revision >= 2147483647) throw new ProductError(409, "RevisionConflict", "Refresh before withdrawing.");
      const publication = (await client.query<{ recipe_id: string }>("SELECT recipe_id FROM savora_product.submission_publications WHERE submission_id=$1 AND withdrawn_at IS NULL FOR UPDATE", [id])).rows[0];
      if (publication) {
        await client.query("UPDATE public.recipes SET status='Archived',updated_at=now() WHERE id=$1", [publication.recipe_id]);
        await client.query("UPDATE savora_product.submission_publications SET withdrawn_at=now() WHERE submission_id=$1", [id]);
        await client.query("UPDATE savora_product.submissions SET revision=revision+1,updated_at=now() WHERE id=$1", [id]);
      } else {
        if (!["Submitted", "InReview", "Draft", "NeedsChanges"].includes(row.state)) throw new ProductError(409, "InvalidTransition", "This submission cannot be withdrawn.");
        await client.query("UPDATE savora_product.submissions SET state='Draft',reviewer_id=NULL,revision=revision+1,updated_at=now() WHERE id=$1", [id]);
      }
      await client.query(`INSERT INTO savora_product.submission_events(submission_id,revision,actor_id,from_state,to_state,reason)
        VALUES($1,$2,$3,$4,$5,$6)`, [id, revision + 1, actor, row.state, publication ? row.state : "Draft", `Withdrawn: ${reason}`.slice(0, 2000)]);
      return { withdrawn: true as const };
    });
  }
}
