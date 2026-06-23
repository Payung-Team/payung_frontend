/** Minimal type declarations for window.Omise (Omise.js CDN — no official @types package) */

interface OmiseCardParams {
  number: string;
  name: string;
  expiration_month: number;
  expiration_year: number;
  security_code: string;
}

interface OmiseTokenResponse {
  object: string;
  id: string;        // "tokn_..." — pass this to backend createPayment mutation
  livemode: boolean;
  used: boolean;
  card: {
    id: string;
    last_digits: string;
    brand: string;
    expiration_month: number;
    expiration_year: number;
    name: string;
    fingerprint: string;
  };
  // only present when status !== 200
  message?: string;
  code?: string;
}

interface OmiseStatic {
  setPublicKey(key: string): void;
  createToken(
    type: 'card',
    params: OmiseCardParams,
    callback: (statusCode: number, response: OmiseTokenResponse) => void,
  ): void;
}

declare global {
  interface Window {
    Omise: OmiseStatic;
  }
}

export {};
