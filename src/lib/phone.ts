// Normalização de telefone pra WhatsApp — tolera qualquer formato colado
// (com/sem +, parênteses, traço, espaço) e devolve só dígitos, prontos pra
// virar JID do WhatsApp (55DDDNNNNNNNNN@s.whatsapp.net, ou código do país +
// número pra internacional).
//
// Detecção de país: "55" (código do Brasil) + 12/13 dígitos totais é uma
// assinatura exclusiva (nenhum outro país usa +55), então sempre tratamos
// como Brasil quando bate — completando o "9" que falta se preciso.
// Sem esse padrão, se o número tiver "+" ou "00" na frente, tratamos como
// internacional (E.164: 8 a 15 dígitos, sem mexer no conteúdo). Números
// "soltos" (sem +/00) com 10 ou 11 dígitos são assumidos como Brasil sem o
// 55 na frente — é o caso mais comum pro nosso público. Pra número
// internacional sem prefixo do Brasil, é preciso digitar o + ou 00 na
// frente pra não ser confundido com um número BR incompleto.

export interface NormalizedPhone {
  phone: string;   // dígitos prontos pro JID (com código do país); dígitos crus quando inválido
  valid: boolean;
  reason?: string;
  international?: boolean; // true quando não é um número brasileiro
}

function normalizeBrazilRest(rest: string, digitsForError: string): NormalizedPhone {
  const ddd = rest.slice(0, 2);
  let number = rest.slice(2);

  if (!/^[1-9][0-9]$/.test(ddd)) {
    return { phone: digitsForError, valid: false, reason: "DDD inválido" };
  }
  if (number.length === 8) {
    number = `9${number}`; // celular sem o 9 — completa
  } else if (number.length !== 9) {
    return { phone: digitsForError, valid: false, reason: "Número incompleto" };
  }

  return { phone: `55${ddd}${number}`, valid: true };
}

export function normalizeBrazilPhone(raw: string): NormalizedPhone {
  const hadIntlPrefix = /^\s*(\+|00)/.test(raw);
  let digits = raw.replace(/\D/g, "");

  if (raw.trim().startsWith("00")) digits = digits.replace(/^00/, "");

  // Trunk "0" antes do DDD (ex: "021 99999-8888") — só remove se sobrar um
  // tamanho plausível de DDD+número (10 ou 11 dígitos).
  let withoutTrunk = digits;
  if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) {
    withoutTrunk = digits.slice(1);
  }

  // Brasil é inconfundível: nenhum outro país usa código 55.
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return normalizeBrazilRest(digits.slice(2), digits);
  }
  if (!hadIntlPrefix && (withoutTrunk.length === 10 || withoutTrunk.length === 11)) {
    return normalizeBrazilRest(withoutTrunk, digits);
  }

  // Internacional: E.164 aceita de 8 a 15 dígitos (código do país + número).
  if (digits.length >= 8 && digits.length <= 15) {
    return { phone: digits, valid: true, international: true };
  }

  return { phone: digits, valid: false, reason: "Quantidade de dígitos inesperada" };
}
