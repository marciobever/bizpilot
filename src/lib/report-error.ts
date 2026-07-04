// Report de erros pro Bugsink (self-hosted, compatível com a API do Sentry).
// Sem SDK: só um POST no endpoint de ingestão. Funciona no servidor e no cliente.
// DSN é semi-público (feito pra embutir em cliente), então pode ficar inline.
const BUGSINK_DSN =
  process.env.NEXT_PUBLIC_BUGSINK_DSN ||
  'https://105363e79651405fb2bab8eeb4f6b36f@bugsink.bizpilot.com.br/1';

function parseDsn(dsn: string): { key: string; host: string; project: string } | null {
  try {
    const u = new URL(dsn);
    return { key: u.username, host: u.host, project: u.pathname.replace(/\//g, '') };
  } catch {
    return null;
  }
}

export async function reportError(error: unknown, extra: Record<string, any> = {}): Promise<void> {
  const dsn = parseDsn(BUGSINK_DSN);
  if (!dsn) return;

  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  const event = {
    event_id: (globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level: 'error',
    logger: 'next-app',
    tags: { source: 'app' },
    message: message.slice(0, 4000),
    extra: {
      ...extra,
      stack: error instanceof Error ? error.stack?.slice(0, 4000) : undefined,
    },
  };

  try {
    await fetch(`https://${dsn.host}/api/${dsn.project}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=bizpilot-app/1.0`,
      },
      body: JSON.stringify(event),
      // não deixa o report travar a resposta
      keepalive: true,
    });
  } catch {
    /* nunca deixa o report quebrar o fluxo */
  }
}
