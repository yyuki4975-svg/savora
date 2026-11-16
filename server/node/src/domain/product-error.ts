/** Public, deliberately non-sensitive product errors. Never wrap driver/provider errors. */
export class ProductError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "ProductError";
  }
}
