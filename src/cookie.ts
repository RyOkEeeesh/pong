import Cookies from "js-cookie";
import { compress, decompress } from "./pako";

export type cookieDef = {
  domain: string,
  secure: boolean,
  expires: number
}

export const cookieDefOption: cookieDef = {
  domain: import.meta.env.VITE_COOKIE_DOMAIN,
  secure: import.meta.env.VITE_COOKIE_SECURE === 'true',
  expires: 365
}

export const cookies = {
  set<T extends object>(key: string, data: T, options?: Cookies.CookieAttributes) {
    const compressed = compress(data);
    Cookies.set(key, compressed, options);
  },

  get<T extends object>(key: string): T | null {
    const value = Cookies.get(key);
    return value ? decompress<T>(value) : null;
  },

  remove(key: string) { Cookies.remove(key); }
};