import Cookies from "js-cookie";
import { compress, decompress } from "./pako";

export function deepAssignWithoutUndefined<T extends object>(target: T, source: Partial<T>): T {
  const result: any = Array.isArray(target) ? [...target] : { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;

    const targetValue = (target as any)[key];

    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof targetValue === "object" &&
      targetValue !== null
    ) {
      result[key] = deepAssignWithoutUndefined(targetValue, value as any);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export type cookieDef = {
  domain: string;
  path: string;
  secure: boolean;
  expires: number;
  samesite?: null | "Strict" | "Lax" | "None";
};

export const cookieDefOption: cookieDef = {
  domain: import.meta.env.VITE_COOKIE_DOMAIN,
  path: import.meta.env.VITE_COOKIE_PATH,
  secure: import.meta.env.VITE_COOKIE_SECURE === "true",
  expires: 365,
  samesite: "Lax",
};

export class Cookie {
  static #accept: boolean = Cookie.readAccept();
  static #cookie: Record<string, unknown> = Cookie.loadAll();

  private static readAccept(): boolean {
    try {
      const value = Cookies.get("accept");
      return value ? decompress<boolean>(value) : false;
    } catch {
      return false;
    }
  }

  private static loadAll(): Record<string, unknown> {
    const all = Cookies.get();
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(all)) {
      try {
        result[k] = decompress(v);
      } catch {
        result[k] = v; // 壊れてる or 非圧縮はそのまま
      }
    }
    return result;
  }

  static get<T>(key: string): T | undefined {
    return this.#cookie[key] as T | undefined;
  }

  static set<T>(key: string, data: T, op?: Cookies.CookieAttributes): void {
    if (key === "accept") {
      if (typeof data !== "boolean") throw new Error("Please set Boolean");

      const wasAccept = this.#accept;
      this.#accept = data;

      if (!data) {
        Object.keys(Cookies.get())
          .filter(k => k !== "accept")
          .forEach(k => Cookies.remove(k));
      } else if (!wasAccept) {
        for (const [k, v] of Object.entries(this.#cookie)) Cookies.set(k, compress(v), op ?? cookieDefOption);
      }
    }

    // 許可されていない場合はキャッシュだけ更新して終了
    if (!this.#accept && key !== "accept") {
      this.#cookie[key] = data;
      return;
    }

    try {
      Cookies.set(key, compress(data), op ?? cookieDefOption);
    } catch {
      throw new Error(`Failed to store cookie: ${key}`);
    }

    this.#cookie[key] = data;
  }

  static hasAccept(): boolean {
    return this.#accept;
  }
}
