import { describe, it, expect, beforeEach } from 'vitest';
import {
  assertPublicHttpUrl,
  SsrfError,
  agentIdFromInstanceName,
  requireInternalSecret,
} from './api-auth';

describe('assertPublicHttpUrl (guard anti-SSRF)', () => {
  it('aceita IP público literal', async () => {
    await expect(assertPublicHttpUrl('https://8.8.8.8/x')).resolves.toBeInstanceOf(URL);
  });

  it('bloqueia loopback', async () => {
    await expect(assertPublicHttpUrl('http://127.0.0.1/')).rejects.toBeInstanceOf(SsrfError);
  });

  it('bloqueia o endpoint de metadados da cloud (169.254.169.254)', async () => {
    await expect(assertPublicHttpUrl('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(SsrfError);
  });

  it('bloqueia faixas privadas', async () => {
    await expect(assertPublicHttpUrl('http://10.0.0.5/')).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicHttpUrl('http://192.168.1.1/')).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicHttpUrl('http://172.16.0.1/')).rejects.toBeInstanceOf(SsrfError);
  });

  it('bloqueia localhost e hostnames internos', async () => {
    await expect(assertPublicHttpUrl('http://localhost/')).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicHttpUrl('http://foo.internal/')).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejeita protocolos não-http', async () => {
    await expect(assertPublicHttpUrl('ftp://8.8.8.8/')).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicHttpUrl('file:///etc/passwd')).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejeita URL malformada', async () => {
    await expect(assertPublicHttpUrl('not a url')).rejects.toBeInstanceOf(SsrfError);
  });
});

describe('agentIdFromInstanceName', () => {
  const uuid = '9d8f716f-5246-4e79-b5fe-0f6446aaa4dd';

  it('extrai o uuid de agent_<uuid>', () => {
    expect(agentIdFromInstanceName(`agent_${uuid}`)).toBe(uuid);
  });

  it('extrai mesmo com sufixo após o uuid', () => {
    expect(agentIdFromInstanceName(`agent_${uuid}_loja`)).toBe(uuid);
  });

  it('retorna null para formato inválido', () => {
    expect(agentIdFromInstanceName('instancia_qualquer')).toBeNull();
    expect(agentIdFromInstanceName('agent_naouuid')).toBeNull();
  });
});

describe('requireInternalSecret', () => {
  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = 'segredo-de-teste';
  });

  const reqWith = (secret?: string) =>
    new Request('http://x/api', { headers: secret ? { 'x-internal-secret': secret } : {} });

  it('autoriza com o segredo correto', () => {
    const r = requireInternalSecret(reqWith('segredo-de-teste'));
    expect(r.ok).toBe(true);
  });

  it('rejeita (401) com segredo errado', async () => {
    const r = requireInternalSecret(reqWith('errado'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it('rejeita (401) sem header', async () => {
    const r = requireInternalSecret(reqWith());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it('erro 500 se o servidor não tem o segredo configurado', async () => {
    delete process.env.INTERNAL_API_SECRET;
    const r = requireInternalSecret(reqWith('qualquer'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(500);
  });
});
