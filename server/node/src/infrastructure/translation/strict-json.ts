/** Native JSON validation plus duplicate-key rejection, including escaped keys.
 * Linear bounded scan; values/strings are data, never executable instructions. */
export function parseUniqueJson(content: string): unknown {
  const value: unknown = JSON.parse(content);
  const stack: Array<{ object: boolean; keys: Set<string>; keyNext: boolean }> = [];
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{' || char === '[') stack.push({ object: char === '{', keys: new Set(), keyNext: char === '{' });
    else if (char === '}' || char === ']') stack.pop();
    else if (char === ',' && stack.at(-1)?.object) stack.at(-1)!.keyNext = true;
    else if (char === '"') {
      const start = i++;
      while (i < content.length && content[i] !== '"') { if (content[i] === '\\') i++; i++; }
      const frame = stack.at(-1);
      if (frame?.object && frame.keyNext) {
        const key = JSON.parse(content.slice(start, i + 1)) as string;
        if (frame.keys.has(key)) throw new Error('Duplicate JSON key.');
        frame.keys.add(key); frame.keyNext = false;
      }
    }
  }
  return value;
}
