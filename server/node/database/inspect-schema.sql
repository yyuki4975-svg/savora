-- Structural comparison excludes data and migration bookkeeping in the drizzle schema.
-- https://www.postgresql.org/docs/17/catalogs.html
SELECT jsonb_build_object(
  'tables', (SELECT jsonb_agg(jsonb_build_object(
    'name', c.relname, 'rls', c.relrowsecurity, 'forceRls', c.relforcerowsecurity,
    'columns', (SELECT jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
      'notNull', a.attnotnull, 'identity', a.attidentity, 'generated', a.attgenerated,
      'default', pg_get_expr(d.adbin, d.adrelid)
    ) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped)
  ) ORDER BY c.relname COLLATE "C") FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')),
  'constraints', (SELECT jsonb_agg(jsonb_build_object(
    'table', c.relname, 'name', k.conname, 'type', k.contype,
    'definition', pg_get_constraintdef(k.oid), 'validated', k.convalidated
  ) ORDER BY c.relname COLLATE "C", k.conname COLLATE "C")
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'),
  'indexes', (SELECT jsonb_agg(jsonb_build_object(
    'table', c.relname, 'name', x.relname, 'definition', pg_get_indexdef(i.indexrelid),
    'valid', i.indisvalid, 'ready', i.indisready
  ) ORDER BY c.relname COLLATE "C", x.relname COLLATE "C") FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid JOIN pg_class x ON x.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'),
  'enums', (SELECT jsonb_agg(jsonb_build_object('name', t.typname, 'value', e.enumlabel)
    ORDER BY t.typname COLLATE "C", e.enumsortorder) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public')
) AS schema;
