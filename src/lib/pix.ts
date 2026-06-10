// Geração do payload Pix "Copia e Cola" (BR Code / EMV QR Code do Banco Central).
// Padrão aberto: não depende de nenhum gateway, vai direto para a chave Pix do
// usuário. Referência: Manual de Padrões para Iniciação do Pix (BCB).

function emvField(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

function sanitize(value: string, maxLen: number): string {
  const diacritics = /[̀-ͯ]/g;
  const cleaned = value
    .normalize('NFD').replace(diacritics, '') // remove acentos
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase();
  return (cleaned || 'NA').slice(0, maxLen);
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayload(opts: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  description?: string;
}): string {
  const merchantName = sanitize(opts.merchantName, 25);
  const merchantCity = sanitize(opts.merchantCity, 15);

  let merchantAccountInfo = emvField('00', 'br.gov.bcb.pix') + emvField('01', opts.pixKey.trim());
  if (opts.description) {
    merchantAccountInfo += emvField('02', sanitize(opts.description, 50));
  }

  let payload =
    emvField('00', '01') +
    emvField('01', opts.amount ? '12' : '11') +
    emvField('26', merchantAccountInfo) +
    emvField('52', '0000') +
    emvField('53', '986');

  if (opts.amount) {
    payload += emvField('54', opts.amount.toFixed(2));
  }

  payload +=
    emvField('58', 'BR') +
    emvField('59', merchantName) +
    emvField('60', merchantCity) +
    emvField('62', emvField('05', '***'));

  payload += '6304';
  payload += crc16(payload);
  return payload;
}
