const DIST_ROOT = new URL('../dist/', import.meta.url);
const DEFAULT_DOCUMENT = 'index.html';
const SERVE_HOSTNAME = '127.0.0.1';
const SERVE_PORT = 4173;
const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;

const assetPathFor = (pathname: string): string | null => {
  const relative = pathname.endsWith('/')
    ? `${pathname.slice(1)}${DEFAULT_DOCUMENT}`
    : pathname.slice(1);
  const target = new URL(relative, DIST_ROOT);

  return target.pathname.startsWith(DIST_ROOT.pathname) ? target.pathname : null;
};

const respond = async (request: Request): Promise<Response> => {
  const assetPath = assetPathFor(new URL(request.url).pathname);

  if (assetPath === null) {
    return new Response('Forbidden', { status: FORBIDDEN_STATUS });
  }

  const file = Bun.file(assetPath);

  if (!(await file.exists())) {
    return new Response('Not found', { status: NOT_FOUND_STATUS });
  }

  return new Response(file);
};

const server = Bun.serve({
  fetch: respond,
  hostname: SERVE_HOSTNAME,
  port: SERVE_PORT,
});

console.log(`Serving dist at ${server.url.href}`);
