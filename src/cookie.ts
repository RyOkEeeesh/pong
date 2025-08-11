import Cookies from "js-cookie";
import { compress, decompress } from "./pako";

export type cookieDef = {
  domain: string,
  path: string
  secure: boolean,
  expires: number
  samesite?: null | 'Strict' | 'Lax' | 'None',
}

export const cookieDefOption: cookieDef = {
  domain: import.meta.env.VITE_COOKIE_DOMAIN,
  path: import.meta.env.VITE_COOKIE_PATH,
  secure: import.meta.env.VITE_COOKIE_SECURE === 'true',
  expires: 365,
  samesite: 'Lax'
}

export const cookies = {
  set<T extends object>(key: string, data: T, options?: Cookies.CookieAttributes) {
    const compressed = compress(data);
    Cookies.set(key, compressed, options ?? cookieDefOption);
    console.log('cookie set');
  },

  get<T extends object>(key: string): T | null {
    const value = Cookies.get(key);
    return value ? decompress<T>(value) : null;
  },

  remove(key: string) { Cookies.remove(key); }
};