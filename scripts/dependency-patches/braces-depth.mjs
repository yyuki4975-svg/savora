import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const depthLimit = "  const maxDepth = Number.isFinite(options.maxDepth) ? Math.min(100, options.maxDepth) : 100;\n";
const walkerGuard = "    if (node.nodes && depth > maxDepth) {\n      throw new RangeError(`AST depth (${depth}), exceeds max depth (${maxDepth})`);\n    }\n";
const parserGuard = "      if (stack.length > maxDepth) {\n        throw new SyntaxError(`Input depth (${stack.length}), exceeds max depth (${maxDepth})`);\n      }\n";

export const bracesPatchFiles = {
  "parse.js": {
    original: "e572166565f15fa6ad9865ae49d678218e32aabfd1b3720f6d0d43d39800d310",
    patched: "e092c4d8e15e187fb8c7452b54f3ca70534283c60c92ee8a86ff17ecf41c8600",
    edits: [
      ["  const ast = { type: 'root', input, nodes: [] };", "  const maxDepth = Number.isFinite(opts.maxDepth) ? Math.min(100, opts.maxDepth) : 100;\n\n  const ast = { type: 'root', input, nodes: [] };"],
      ["    if (value === CHAR_LEFT_PARENTHESES) {\n", "    if (value === CHAR_LEFT_PARENTHESES) {\n" + parserGuard],
      ["    if (value === CHAR_LEFT_CURLY_BRACE) {\n", "    if (value === CHAR_LEFT_CURLY_BRACE) {\n" + parserGuard],
    ],
  },
  "compile.js": {
    original: "dc98f22eee3d511785d92a00758d5f0d48efed5f5813bdecc2de430c529b5c9f",
    patched: "fba8d1bbfd74df4f8d468f95b59bfbc208aa66af2b78e49b14608aafd9f7ca54",
    edits: [
      ["  const walk = (node, parent = {}) => {\n", depthLimit + "\n  const walk = (node, parent = {}, depth = 0) => {\n" + walkerGuard],
      ["output += walk(child, node);", "output += walk(child, node, child.nodes ? depth + 1 : depth);"],
      ["return walk(ast);", "return walk(ast, {}, ast.type === 'root' ? 0 : 1);"],
    ],
  },
  "expand.js": {
    original: "41ccc196ebfa7b7781a634e721eb744e4e7bcb54cba427a7e3d6806a1b9e58f7",
    patched: "782ebc490bb42ddde048e5fb0ed35f84891db205baca233ca7a8ae95c96bd855",
    edits: [
      ["  const walk = (node, parent = {}) => {\n", depthLimit + "\n  const walk = (node, parent = {}, depth = 0) => {\n" + walkerGuard],
      ["walk(child, node);", "walk(child, node, child.nodes ? depth + 1 : depth);"],
      ["return utils.flatten(walk(ast));", "return utils.flatten(walk(ast, {}, ast.type === 'root' ? 0 : 1));"],
    ],
  },
  "stringify.js": {
    original: "379f22d77bfa1478341ccd49c5e4267464aabcbba03558bab332aac23fc6f23a",
    patched: "9f4f3ebf8be02ca0d612f36cecf5827f664983f064d0d36b8df644261e84c520",
    edits: [
      ["  const stringify = (node, parent = {}) => {\n", depthLimit + "\n  const stringify = (node, parent = {}, depth = 0) => {\n" + walkerGuard],
      ["output += stringify(child);", "output += stringify(child, {}, child.nodes ? depth + 1 : depth);"],
      ["return stringify(ast);", "return stringify(ast, {}, ast.type === 'root' ? 0 : 1);"],
    ],
  },
};

export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

export function patchBracesSource(file, source) {
  const spec = bracesPatchFiles[file];
  if (!spec || sha256(source) !== spec.original) throw new Error(`Unrecognized braces source: ${file}`);
  let result = source;
  for (const [before, after] of spec.edits) {
    if (result.split(before).length !== 2) throw new Error(`Non-unique braces patch context: ${file}`);
    result = result.replace(before, after);
  }
  return result;
}

export function checkBracesPatch({ apply = false, root = repositoryRoot } = {}) {
  const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));
  const copies = Object.entries(lock.packages).filter(([name]) => name.endsWith("/braces"));
  if (copies.length !== 1 || copies[0][0] !== "node_modules/braces" || copies[0][1].version !== "3.0.3") {
    throw new Error("Braces dependency layout/version changed; review the local security backport before continuing.");
  }
  const modules = realpathSync(path.join(root, "node_modules"));
  const target = path.join(modules, "braces");
  if (realpathSync(target) !== target) throw new Error("Refusing to patch a redirected braces directory.");
  const manifest = JSON.parse(readFileSync(path.join(target, "package.json"), "utf8"));
  if (manifest.name !== "braces" || manifest.version !== "3.0.3") throw new Error("Unexpected installed braces identity.");
  const plan = Object.entries(bracesPatchFiles).map(([file, spec]) => {
    const destination = path.join(target, "lib", file);
    if (realpathSync(destination) !== destination) throw new Error(`Redirected braces file: ${file}`);
    const source = readFileSync(destination, "utf8");
    const digest = sha256(source);
    if (digest === spec.patched) return { destination };
    if (!apply || digest !== spec.original) throw new Error(`Braces security patch missing or changed: ${file}`);
    const patched = patchBracesSource(file, source);
    if (sha256(patched) !== spec.patched) throw new Error(`Braces backport digest mismatch: ${file}`);
    return { destination, patched };
  });
  for (const { destination, patched } of plan) {
    if (patched !== undefined) writeFileSync(destination, patched, "utf8");
  }
  return plan.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== "--check")) throw new Error("Usage: node scripts/dependency-patches/braces-depth.mjs [--check]");
    const count = checkBracesPatch({ apply: process.argv[2] !== "--check" });
    console.log(`Verified braces 3.0.3 local depth backport (${count} SHA-256-pinned files). Raw npm advisory remains open.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
