// Hook nativo do Next.js: dispara em qualquer erro no servidor (rotas de API,
// Server Components, etc.) e reporta pro Bugsink. Sem SDK, sem config extra.
export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routePath?: string; routeType?: string },
) {
  const { reportError } = await import('@/lib/report-error');
  await reportError(error, {
    path: request?.path,
    method: request?.method,
    routerKind: context?.routerKind,
    routePath: context?.routePath,
    routeType: context?.routeType,
  });
}
