import type { RequestHandler } from "express";

/** Private loopback BFF hop only. No paid public API or new CORS policy. */
export function translationPipeline(): RequestHandler {
  return (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const reject = (status: number, code: string) => { res.status(status).json({ error: "Translation unavailable", code }); req.resume(); };
    const address = req.socket.remoteAddress;
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address ?? "") || req.headers["x-savora-request"] !== "1") return reject(403, "PrivateTranslationEndpoint");
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return reject(405, "MethodNotAllowed"); }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers["content-type"] ?? "") ||
      req.headers["content-encoding"] && req.headers["content-encoding"] !== "identity") return reject(415, "JsonRequired");
    const parts: Buffer[] = []; let bytes = 0, finished = false;
    const finish = (status: number, code: string) => { if (!finished) { finished = true; parts.length = 0; clearTimeout(timer); reject(status, code); } };
    const timer = setTimeout(() => finish(408, "BodyTimeout"), 10000); timer.unref();
    req.on("data", (chunk: Buffer) => { if (finished) return; bytes += chunk.length; if (bytes > 48 * 1024) return finish(413, "BodyTooLarge"); parts.push(chunk); });
    req.on("end", () => {
      if (finished) return;
      try { req.body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts))); }
      catch { return finish(400, "InvalidJson"); }
      finished = true; clearTimeout(timer); next();
    });
    req.on("error", () => finish(400, "InvalidBody"));
    req.on("aborted", () => { finished = true; parts.length = 0; clearTimeout(timer); });
  };
}
