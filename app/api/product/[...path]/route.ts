import { proxyProduct } from "../../../../lib/auth/account-server";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  return proxyProduct(request, (await context.params).path.join("/"));
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
