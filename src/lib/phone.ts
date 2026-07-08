// Normalização de telefone BR pra WhatsApp — tolera qualquer formato que o
// usuário colar (com/sem +55, parênteses, traço, espaço, DDD junto ou não,
// número de 8 dígitos sem o 9 do celular) e devolve o formato que o WhatsApp
// espera: 55 + DDD(2) + número(9), só dígitos.

export interface NormalizedPhone {
  phone: string;   // 13 dígitos (55DDDNNNNNNNNN) quando válido; dígitos crus quando inválido
  valid: boolean;
  reason?: string;
}

export function normalizeBrazilPhone(raw: string): NormalizedPhone {
  let digits = raw.replace(/\D/g, "");

  // Trunk "0" antes do DDD (ex: "021 99999-8888") — só remove se sobrar um
  // tamanho plausível (10 ou 11 dígitos: DDD + número).
  if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1);
  }

  let rest: string;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    rest = digits.slice(2);
  } else if (digits.length === 10 || digits.length === 11) {
    rest = digits;
  } else {
    return { phone: digits, valid: false, reason: "Quantidade de dígitos inesperada" };
  }

  const ddd = rest.slice(0, 2);
  let number = rest.slice(2);

  if (!/^[1-9][0-9]$/.test(ddd)) {
    return { phone: digits, valid: false, reason: "DDD inválido" };
  }
  if (number.length === 8) {
    number = `9${number}`; // celular sem o 9 — completa (fixo também cai aqui, mas WhatsApp é só celular mesmo)
  } else if (number.length !== 9) {
    return { phone: digits, valid: false, reason: "Número incompleto" };
  }

  return { phone: `55${ddd}${number}`, valid: true };
}
