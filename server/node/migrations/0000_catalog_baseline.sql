-- Savora PostgreSQL baseline after owner-accepted C# retirement.
CREATE TABLE public."__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL
);



CREATE TABLE public.collection_items (
    id uuid NOT NULL,
    collection_id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    "position" integer NOT NULL,
    CONSTRAINT ck_collection_items_position CHECK (("position" > 0))
);



CREATE TABLE public.curated_collections (
    id uuid NOT NULL,
    slug character varying(120) NOT NULL,
    title character varying(240) NOT NULL,
    summary character varying(2000) NOT NULL,
    status character varying(32) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_curated_collections_status CHECK (((status)::text = ANY (ARRAY[('Draft'::character varying)::text, ('InReview'::character varying)::text, ('Published'::character varying)::text, ('Archived'::character varying)::text])))
);



CREATE TABLE public.media_assets (
    id uuid NOT NULL,
    storage_key character varying(1024),
    content_type character varying(120) NOT NULL,
    alt_text character varying(1000) NOT NULL,
    creator character varying(240) NOT NULL,
    license_code character varying(80) NOT NULL,
    rights_status character varying(32) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    external_id character varying(240) NOT NULL,
    height integer,
    license_url character varying(2048) NOT NULL,
    provider character varying(120) NOT NULL,
    source_url character varying(2048),
    width integer,
    CONSTRAINT ck_media_assets_dimensions CHECK ((((width IS NULL) AND (height IS NULL)) OR ((width >= 1) AND (width <= 32768) AND ((height >= 1) AND (height <= 32768))))),
    CONSTRAINT ck_media_assets_license_url CHECK (((license_url)::text ~~ 'https://%'::text)),
    CONSTRAINT ck_media_assets_location CHECK (((storage_key IS NOT NULL) OR (source_url IS NOT NULL))),
    CONSTRAINT ck_media_assets_rights_status CHECK (((rights_status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Verified'::character varying)::text, ('Rejected'::character varying)::text]))),
    CONSTRAINT ck_media_assets_source_url CHECK (((source_url IS NULL) OR ((source_url)::text ~~ 'https://%'::text)))
);



CREATE TABLE public.media_review_decisions (
    review_import_id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    candidate_provider_id character varying(240),
    decision character varying(32) NOT NULL,
    recipe_checked boolean NOT NULL,
    visual_checked boolean NOT NULL,
    rights_checked boolean NOT NULL,
    quality_checked boolean NOT NULL,
    note character varying(2000),
    CONSTRAINT ck_media_review_decisions_acceptance_checks CHECK ((((decision)::text <> 'VisuallyAccepted'::text) OR (rights_checked AND quality_checked))),
    CONSTRAINT ck_media_review_decisions_candidate_identity CHECK (((((decision)::text = 'ConfirmedNoMatch'::text) AND (candidate_provider_id IS NULL)) OR (((decision)::text = ANY (ARRAY[('VisuallyAccepted'::character varying)::text, ('Rejected'::character varying)::text])) AND (candidate_provider_id IS NOT NULL)) OR ((decision)::text = 'NeedsReplacement'::text))),
    CONSTRAINT ck_media_review_decisions_decision CHECK (((decision)::text = ANY (ARRAY[('VisuallyAccepted'::character varying)::text, ('Rejected'::character varying)::text, ('ConfirmedNoMatch'::character varying)::text, ('NeedsReplacement'::character varying)::text]))),
    CONSTRAINT ck_media_review_decisions_required_checks CHECK ((recipe_checked AND visual_checked))
);



CREATE TABLE public.media_review_imports (
    id uuid NOT NULL,
    batch_id character varying(120) NOT NULL,
    scope character varying(64) NOT NULL,
    payload_sha256 character varying(64) NOT NULL,
    manifest_sha256 character varying(64) NOT NULL,
    exported_at timestamp with time zone NOT NULL,
    imported_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_media_review_imports_manifest_sha256 CHECK (((manifest_sha256)::text ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_media_review_imports_payload_sha256 CHECK (((payload_sha256)::text ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_media_review_imports_scope CHECK (((scope)::text = 'LocalEditorialReviewOnly'::text))
);



CREATE TABLE public.place_names (
    id uuid NOT NULL,
    place_id uuid NOT NULL,
    locale character varying(16) NOT NULL,
    name character varying(240) NOT NULL
);



CREATE TABLE public.places (
    id uuid NOT NULL,
    slug character varying(120) NOT NULL,
    type character varying(32) NOT NULL,
    latitude double precision,
    longitude double precision,
    wikidata_id character varying(32),
    CONSTRAINT ck_places_coordinates CHECK ((((latitude IS NULL) AND (longitude IS NULL)) OR ((latitude IS NOT NULL) AND (longitude IS NOT NULL) AND ((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)) AND ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))))),
    CONSTRAINT ck_places_type CHECK (((type)::text = ANY (ARRAY[('Country'::character varying)::text, ('Region'::character varying)::text, ('City'::character varying)::text])))
);



CREATE TABLE public.recipe_ingredient_lines (
    id uuid NOT NULL,
    recipe_version_id uuid NOT NULL,
    "position" integer NOT NULL,
    name character varying(240) NOT NULL,
    quantity numeric(12,4),
    unit character varying(80),
    preparation_note character varying(500),
    CONSTRAINT ck_recipe_ingredient_lines_position CHECK (("position" > 0)),
    CONSTRAINT ck_recipe_ingredient_lines_quantity CHECK (((quantity IS NULL) OR (quantity >= (0)::numeric)))
);



CREATE TABLE public.recipe_media_associations (
    recipe_id uuid NOT NULL,
    media_asset_id uuid NOT NULL,
    "position" integer NOT NULL,
    is_primary boolean NOT NULL,
    CONSTRAINT ck_recipe_media_associations_position CHECK ((("position" >= 1) AND ("position" <= 1000)))
);



CREATE TABLE public.recipe_place_associations (
    recipe_id uuid NOT NULL,
    place_id uuid NOT NULL,
    relation_type character varying(32) NOT NULL,
    is_primary boolean NOT NULL,
    CONSTRAINT ck_recipe_place_associations_relation_type CHECK (((relation_type)::text = ANY (ARRAY[('Origin'::character varying)::text, ('RegionalVariation'::character varying)::text, ('Diaspora'::character varying)::text, ('DiscoveryAnchor'::character varying)::text])))
);



CREATE TABLE public.recipe_publication_audits (
    id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    recipe_version_id uuid NOT NULL,
    based_on_version integer NOT NULL,
    from_status character varying(32) NOT NULL,
    to_status character varying(32) NOT NULL,
    payload_sha256 character varying(64) NOT NULL,
    reviewed_by character varying(120) NOT NULL,
    review_note character varying(2000) NOT NULL,
    media_policy character varying(64) NOT NULL,
    approved_at timestamp with time zone NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_recipe_publication_audits_based_on_version CHECK ((based_on_version > 0)),
    CONSTRAINT ck_recipe_publication_audits_media_policy CHECK (((media_policy)::text = ANY (ARRAY[('VerifiedPrimaryRequired'::character varying)::text, ('OwnerApprovedPrimary'::character varying)::text, ('ReviewedContentMediaOptional'::character varying)::text]))),
    CONSTRAINT ck_recipe_publication_audits_payload_sha256 CHECK (((payload_sha256)::text ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_recipe_publication_audits_status_transition CHECK ((((from_status)::text = 'Draft'::text) AND ((to_status)::text = 'Published'::text))),
    CONSTRAINT ck_recipe_publication_audits_times CHECK ((recorded_at >= approved_at))
);



CREATE TABLE public.recipe_steps (
    id uuid NOT NULL,
    recipe_version_id uuid NOT NULL,
    "position" integer NOT NULL,
    instruction character varying(5000) NOT NULL,
    title character varying(160),
    duration_minutes integer,
    CONSTRAINT ck_recipe_steps_duration CHECK (((duration_minutes IS NULL) OR ((duration_minutes >= 0) AND (duration_minutes <= 10080)))),
    CONSTRAINT ck_recipe_steps_position CHECK (("position" > 0))
);



CREATE TABLE public.recipe_translations (
    id uuid NOT NULL,
    recipe_version_id uuid NOT NULL,
    locale character varying(16) NOT NULL,
    title character varying(240) NOT NULL,
    summary character varying(2000) NOT NULL,
    cultural_note character varying(8000),
    is_machine_translated boolean NOT NULL
);



CREATE TABLE public.recipe_versions (
    id uuid NOT NULL,
    recipe_id uuid NOT NULL,
    version_number integer NOT NULL,
    original_locale character varying(16) NOT NULL,
    servings integer NOT NULL,
    preparation_minutes integer,
    cooking_minutes integer,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT ck_recipe_versions_cooking_minutes CHECK (((cooking_minutes IS NULL) OR ((cooking_minutes >= 0) AND (cooking_minutes <= 10080)))),
    CONSTRAINT ck_recipe_versions_preparation_minutes CHECK (((preparation_minutes IS NULL) OR ((preparation_minutes >= 0) AND (preparation_minutes <= 10080)))),
    CONSTRAINT ck_recipe_versions_servings CHECK (((servings >= 1) AND (servings <= 1000)))
);



CREATE TABLE public.recipes (
    id uuid NOT NULL,
    slug character varying(120) NOT NULL,
    status character varying(32) NOT NULL,
    current_version_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    published_at timestamp with time zone,
    CONSTRAINT ck_recipes_published_version CHECK ((((status)::text <> 'Published'::text) OR (current_version_id IS NOT NULL))),
    CONSTRAINT ck_recipes_status CHECK (((status)::text = ANY (ARRAY[('Draft'::character varying)::text, ('InReview'::character varying)::text, ('Published'::character varying)::text, ('Archived'::character varying)::text])))
);



CREATE TABLE public.source_attributions (
    id uuid NOT NULL,
    recipe_version_id uuid NOT NULL,
    source_url character varying(2048) NOT NULL,
    source_name character varying(240) NOT NULL,
    license_code character varying(80) NOT NULL,
    retrieved_at timestamp with time zone NOT NULL,
    external_id character varying(240)
);



ALTER TABLE ONLY public."__EFMigrationsHistory"
    ADD CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId");



ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT pk_collection_items PRIMARY KEY (id);



ALTER TABLE ONLY public.curated_collections
    ADD CONSTRAINT pk_curated_collections PRIMARY KEY (id);



ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT pk_media_assets PRIMARY KEY (id);



ALTER TABLE ONLY public.media_review_decisions
    ADD CONSTRAINT pk_media_review_decisions PRIMARY KEY (review_import_id, recipe_id);



ALTER TABLE ONLY public.media_review_imports
    ADD CONSTRAINT pk_media_review_imports PRIMARY KEY (id);



ALTER TABLE ONLY public.place_names
    ADD CONSTRAINT pk_place_names PRIMARY KEY (id);



ALTER TABLE ONLY public.places
    ADD CONSTRAINT pk_places PRIMARY KEY (id);



ALTER TABLE ONLY public.recipe_ingredient_lines
    ADD CONSTRAINT pk_recipe_ingredient_lines PRIMARY KEY (id);



ALTER TABLE ONLY public.recipe_media_associations
    ADD CONSTRAINT pk_recipe_media_associations PRIMARY KEY (recipe_id, media_asset_id);



ALTER TABLE ONLY public.recipe_place_associations
    ADD CONSTRAINT pk_recipe_place_associations PRIMARY KEY (recipe_id, place_id, relation_type);



ALTER TABLE ONLY public.recipe_publication_audits
    ADD CONSTRAINT pk_recipe_publication_audits PRIMARY KEY (id);



ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT pk_recipe_steps PRIMARY KEY (id);



ALTER TABLE ONLY public.recipe_translations
    ADD CONSTRAINT pk_recipe_translations PRIMARY KEY (id);



ALTER TABLE ONLY public.recipe_versions
    ADD CONSTRAINT pk_recipe_versions PRIMARY KEY (id);



ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT pk_recipes PRIMARY KEY (id);



ALTER TABLE ONLY public.source_attributions
    ADD CONSTRAINT pk_source_attributions PRIMARY KEY (id);



CREATE INDEX "IX_collection_items_recipe_id" ON public.collection_items USING btree (recipe_id);



CREATE INDEX "IX_recipes_current_version_id" ON public.recipes USING btree (current_version_id);



CREATE INDEX "IX_source_attributions_recipe_version_id" ON public.source_attributions USING btree (recipe_version_id);



CREATE INDEX ix_media_review_decisions_recipe_id ON public.media_review_decisions USING btree (recipe_id);



CREATE INDEX ix_media_review_imports_batch_imported_at ON public.media_review_imports USING btree (batch_id, imported_at);



CREATE INDEX ix_places_wikidata_id ON public.places USING btree (wikidata_id);



CREATE INDEX ix_recipe_media_associations_media_asset_id ON public.recipe_media_associations USING btree (media_asset_id);



CREATE INDEX ix_recipe_place_associations_place_id ON public.recipe_place_associations USING btree (place_id);



CREATE INDEX ix_recipe_publication_audits_recipe_recorded_at ON public.recipe_publication_audits USING btree (recipe_id, recorded_at);



CREATE INDEX ix_recipe_publication_audits_recipe_version_id ON public.recipe_publication_audits USING btree (recipe_version_id);



CREATE INDEX ix_recipe_translations_title ON public.recipe_translations USING btree (title);



CREATE INDEX ix_recipes_status_published_at ON public.recipes USING btree (status, published_at);



CREATE UNIQUE INDEX ux_collection_items_position ON public.collection_items USING btree (collection_id, "position");



CREATE UNIQUE INDEX ux_collection_items_recipe ON public.collection_items USING btree (collection_id, recipe_id);



CREATE UNIQUE INDEX ux_curated_collections_slug ON public.curated_collections USING btree (slug);



CREATE UNIQUE INDEX ux_media_assets_provider_external_id ON public.media_assets USING btree (provider, external_id);



CREATE UNIQUE INDEX ux_media_assets_storage_key ON public.media_assets USING btree (storage_key);



CREATE UNIQUE INDEX ux_media_review_imports_payload_sha256 ON public.media_review_imports USING btree (payload_sha256);



CREATE UNIQUE INDEX ux_place_names_place_locale ON public.place_names USING btree (place_id, locale);



CREATE UNIQUE INDEX ux_places_slug ON public.places USING btree (slug);



CREATE UNIQUE INDEX ux_recipe_ingredient_lines_version_position ON public.recipe_ingredient_lines USING btree (recipe_version_id, "position");



CREATE UNIQUE INDEX ux_recipe_media_associations_position ON public.recipe_media_associations USING btree (recipe_id, "position");



CREATE UNIQUE INDEX ux_recipe_media_associations_primary_recipe ON public.recipe_media_associations USING btree (recipe_id) WHERE is_primary;



CREATE UNIQUE INDEX ux_recipe_place_associations_primary_recipe ON public.recipe_place_associations USING btree (recipe_id) WHERE is_primary;



CREATE UNIQUE INDEX ux_recipe_publication_audits_payload_sha256 ON public.recipe_publication_audits USING btree (payload_sha256);



CREATE UNIQUE INDEX ux_recipe_publication_audits_recipe_version ON public.recipe_publication_audits USING btree (recipe_id, recipe_version_id);



CREATE UNIQUE INDEX ux_recipe_steps_version_position ON public.recipe_steps USING btree (recipe_version_id, "position");



CREATE UNIQUE INDEX ux_recipe_translations_version_locale ON public.recipe_translations USING btree (recipe_version_id, locale);



CREATE UNIQUE INDEX ux_recipe_versions_recipe_version ON public.recipe_versions USING btree (recipe_id, version_number);



CREATE UNIQUE INDEX ux_recipes_slug ON public.recipes USING btree (slug);



ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT "FK_collection_items_curated_collections_collection_id" FOREIGN KEY (collection_id) REFERENCES public.curated_collections(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT "FK_collection_items_recipes_recipe_id" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE RESTRICT;



ALTER TABLE ONLY public.media_review_decisions
    ADD CONSTRAINT "FK_media_review_decisions_media_review_imports_review_import_id" FOREIGN KEY (review_import_id) REFERENCES public.media_review_imports(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.media_review_decisions
    ADD CONSTRAINT "FK_media_review_decisions_recipes_recipe_id" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE RESTRICT;



ALTER TABLE ONLY public.place_names
    ADD CONSTRAINT "FK_place_names_places_place_id" FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.recipe_ingredient_lines
    ADD CONSTRAINT "FK_recipe_ingredient_lines_recipe_versions_recipe_version_id" FOREIGN KEY (recipe_version_id) REFERENCES public.recipe_versions(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.recipe_media_associations
    ADD CONSTRAINT "FK_recipe_media_associations_media_assets_media_asset_id" FOREIGN KEY (media_asset_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;



ALTER TABLE ONLY public.recipe_media_associations
    ADD CONSTRAINT "FK_recipe_media_associations_recipes_recipe_id" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.recipe_place_associations
    ADD CONSTRAINT "FK_recipe_place_associations_places_place_id" FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE RESTRICT;



ALTER TABLE ONLY public.recipe_place_associations
    ADD CONSTRAINT "FK_recipe_place_associations_recipes_recipe_id" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.recipe_publication_audits
    ADD CONSTRAINT "FK_recipe_publication_audits_recipe_versions_recipe_version_id" FOREIGN KEY (recipe_version_id) REFERENCES public.recipe_versions(id) ON DELETE RESTRICT;



ALTER TABLE ONLY public.recipe_publication_audits
    ADD CONSTRAINT "FK_recipe_publication_audits_recipes_recipe_id" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE RESTRICT;



ALTER TABLE ONLY public.recipe_steps
    ADD CONSTRAINT "FK_recipe_steps_recipe_versions_recipe_version_id" FOREIGN KEY (recipe_version_id) REFERENCES public.recipe_versions(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.recipe_translations
    ADD CONSTRAINT "FK_recipe_translations_recipe_versions_recipe_version_id" FOREIGN KEY (recipe_version_id) REFERENCES public.recipe_versions(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.recipe_versions
    ADD CONSTRAINT "FK_recipe_versions_recipes_recipe_id" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;



ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT "FK_recipes_recipe_versions_current_version_id" FOREIGN KEY (current_version_id) REFERENCES public.recipe_versions(id) ON DELETE RESTRICT;



ALTER TABLE ONLY public.source_attributions
    ADD CONSTRAINT "FK_source_attributions_recipe_versions_recipe_version_id" FOREIGN KEY (recipe_version_id) REFERENCES public.recipe_versions(id) ON DELETE CASCADE;

INSERT INTO public."__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES
('20260910173449_InitialCatalog', '10.0.12'),
('20260910173750_AddCatalogIntegrityConstraints', '10.0.12'),
('20260911171852_AddRecipePlaceAssociations', '10.0.12'),
('20260913084122_ExtendMediaProvenanceAndRecipeAssociations', '10.0.12'),
('20260913154609_AddMediaReviewImports', '10.0.12'),
('20260913171652_SupportRemoteMediaReferences', '10.0.12'),
('20260914163816_AddRecipePublicationAudits', '10.0.12'),
('20260920191139_ExpandRecipePublicationMediaPolicies', '10.0.12');
