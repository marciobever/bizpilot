// O SDK oficial da Efí é JS puro, sem typings publicados.
declare module "sdk-node-apis-efi" {
  type EfiOptions = {
    sandbox: boolean;
    client_id: string;
    client_secret: string;
    certificate?: string;
    cert_base64?: boolean;
    validateMtls?: boolean;
  };
  class EfiPay {
    constructor(options: EfiOptions);
    [method: string]: (params?: any, body?: any) => Promise<any>;
  }
  export = EfiPay;
}

declare module "payment-token-efi" {
  const EfiPay: {
    CreditCard: {
      setAccount(payeeCode: string): typeof EfiPay.CreditCard;
      setEnvironment(env: "production" | "sandbox"): typeof EfiPay.CreditCard;
      setCardNumber(number: string): typeof EfiPay.CreditCard;
      verifyCardBrand(): Promise<string>;
      setCreditCardData(data: {
        brand: string;
        number: string;
        cvv: string;
        expirationMonth: string;
        expirationYear: string;
        holderName?: string;
        holderDocument?: string;
        reuse?: boolean;
      }): typeof EfiPay.CreditCard;
      getPaymentToken(): Promise<{ payment_token: string; card_mask: string }>;
    };
  };
  export default EfiPay;
}
