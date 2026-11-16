import { Body, Controller, Inject, Post } from "@nestjs/common";
import { TRANSLATOR, type Translator } from "../contracts/translation";

// Nest composition only; the provider owns no browser credentials or database rows.
// Source: https://docs.nestjs.com/controllers#request-payloads
@Controller("v1/translate")
export class TranslationController {
  constructor(@Inject(TRANSLATOR) private readonly translator: Translator) {}
  @Post()
  translate(@Body() payload: unknown) { return this.translator.translate(payload); }
}
