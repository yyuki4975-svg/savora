export interface TranslationRequest { texts: string[]; target: string; source?: string }
export interface TranslationResult { translations: string[]; cached: boolean }
export const TRANSLATOR = Symbol("Translator");
export interface Translator { translate(payload: unknown): Promise<TranslationResult> }
