import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".fold", "application/json; charset=utf-8"]
]);

export function createDemoServer(options = {}) {
  const root = resolve(options.root ?? process.cwd());

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (url.pathname === "/" || url.pathname === "/demo") {
        redirect(response, "/demo/");
        return;
      }

      const pathname = decodeURIComponent(url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname);
      const filePath = resolve(root, `.${pathname}`);
      if (!isInsideRoot(root, filePath)) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
      }

      const content = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": MIME_TYPES.get(extname(filePath)) ?? "application/octet-stream",
        "Cache-Control": "no-store"
      });
      response.end(content);
    } catch (error) {
      const status = error?.code === "ENOENT" ? 404 : 500;
      response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(status === 404 ? "Not found" : "Server error");
    }
  });
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function isInsideRoot(root, filePath) {
  return filePath === root || filePath.startsWith(`${root}${sep}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
  const server = createDemoServer();
  server.listen(port, () => {
    console.log(`foldgen demo: http://localhost:${port}/demo/`);
  });
}
