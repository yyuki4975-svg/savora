import type { TranslationRequest } from "../../contracts/translation";
import { ProductError } from "../../domain/product-error";

const locales = new Set(["en", "zh", "ja", "fr", "it", "es"]);
export function validateTranslation(value: unknown): TranslationRequest {
  const invalid = () => { throw new ProductError(422, "InvalidTranslation", "Invalid translation request."); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !["texts", "source", "target"].includes(key))) return invalid();
  if (typeof v.target !== "string" || !locales.has(v.target)) return invalid();
  if (v.source !== undefined && (typeof v.source !== "string" || !locales.has(v.source))) return invalid();
  if (!Array.isArray(v.texts) || v.texts.length > 100 || v.texts.some(text => typeof text !== "string" || text.length > 3000)) return invalid();
  const texts = v.texts as string[];
  if (texts.join("").length > 6000 || texts.some(text => /__SAVORA_NUMBER_|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))) return invalid();
  return { texts, target: v.target, ...(v.source === undefined ? {} : { source: v.source as string }) };
}
