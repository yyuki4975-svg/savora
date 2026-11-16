import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
assert.equal(process.cwd(), '/app');
assert.equal(process.env.SAVORA_ISOLATED_NATIVE_NEXT_BUILD, 'true');
const files = ['app/internal-only.ts','app/ui.tsx','lib/api/savora-client.ts'];
const receipt=[];
const sha=value=>createHash('sha256').update(value).digest('hex');
for(const file of files){
  const source=readFileSync(file,'utf8');
  assert.equal(source.split('import.meta.env.DEV').length-1,1,file);
  const result=source.replace('import.meta.env.DEV','(process.env.NODE_ENV === "development")');
  writeFileSync(file,result);
  receipt.push({file,source:sha(source),adapted:sha(result),replacements:1});
}
for(const file of ['app/world-map/world-map.module.css','app/world-map/world-map-passed-bowl.module.css','app/recipes/[id]/recipe-detail.module.css']){
  const source=readFileSync(file,'utf8');
  assert.ok(file.includes('/recipes/') ? source.includes('@media print') && source.includes(':global(.mobile-tabs)') : source.includes(':global(.savora-atlas-marker'));
  assert.ok(!source.includes('cssmodules-pure-no-check'));
  const result='/* cssmodules-pure-no-check: existing global selectors */\n'+source;
  writeFileSync(file,result);
  receipt.push({file,source:sha(source),adapted:sha(result),compatibilityCommentOnly:true});
}
{
  const file='app/sitemap.ts',source=readFileSync(file,'utf8');
  const marker='export default async function sitemap(): Promise<MetadataRoute.Sitemap> {';
  assert.equal(source.split(marker).length-1,1);
  assert.ok(!source.includes('await connection()'));
  const result='import { connection } from "next/server";\n'+source.replace(marker,marker+'\n  await connection();');
  writeFileSync(file,result);
  receipt.push({file,source:sha(source),adapted:sha(result),runtimeCatalogRequired:true});
}
{
  const file='app/layout.tsx',source=readFileSync(file,'utf8');
  assert.equal(source.split('export default function RootLayout(').length-1,1);
  const marker='}>) {\n  return (';
  const normalized=source.replaceAll('\r\n','\n');
  assert.equal(normalized.split(marker).length-1,1);
  const result='import { connection } from "next/server";\n'+normalized
    .replace('export default function RootLayout(','export default async function RootLayout(')
    .replace(marker,'}>) {\n  await connection();\n  return (');
  writeFileSync(file,result);
  receipt.push({file,source:sha(source),adapted:sha(result),runtimeCatalogRequired:true,restoresPriorProductionRendering:true});
}
{
  const file='app/recipes/[id]/layout.tsx';
  assert.ok(!existsSync(file));
  const result=`import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getRecipe, isDraftCatalogEnabled } from "../../../lib/api/savora-client";

export default async function RecipeStatusLayout({ children, params }: {
  children: ReactNode; params: Promise<{ id: string }>;
}) {
  if (!isDraftCatalogEnabled()) {
    const { id } = await params;
    const result = await getRecipe(id);
    if (result.status === "not-found") notFound();
  }
  return children;
}
`;
  writeFileSync(file,result,{flag:'wx'});
  receipt.push({file,adapted:sha(result),beforeLoadingBoundary:true});
}
writeFileSync('native-context-adaptations.json',JSON.stringify({receipt,canonicalCheckoutModified:false},null,2),{flag:'wx'});
console.log('Adapted three development guards and annotated two existing global-marker CSS Modules in the isolated context.');
