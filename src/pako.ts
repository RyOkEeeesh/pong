import { deflate, inflate } from "pako";
import CryptoJS from "crypto-js";

// Node.js単体実行でも import.meta.env を定義
if (typeof import.meta.env === "undefined") {
  (import.meta as any).env = {};
}

if (import.meta.env.MODE === "development") {
  const dotenv = await import("dotenv");
  dotenv.config();

  // dotenv読み込み後、Node実行時でも import.meta.env に値をコピー
  Object.assign(import.meta.env, process.env);
}

const SECRET_KEY = import.meta.env.VITE_SECRET_KEY;

export function compress<T>(data: T): string {
  const json = JSON.stringify(data);
  const binary = deflate(json);
  let str = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < binary.length; i += chunkSize) {
    str += String.fromCharCode(...binary.subarray(i, i + chunkSize));
  }
  return CryptoJS.AES.encrypt(btoa(str), SECRET_KEY).toString()
}

export function decompress<T>(base64: string): T {
  const binaryString = atob(CryptoJS.AES.decrypt(base64, SECRET_KEY).toString(CryptoJS.enc.Utf8));
  const len = binaryString.length;
  const binary = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    binary[i] = binaryString.charCodeAt(i);
  }
  const json = inflate(binary, { to: 'string' });
  return JSON.parse(json) as T;
}

console.log(decompress('U2FsdGVkX1/F1sV7U38ETJTmHCoJYdZW6c9vvLBl9/8Yl9zxOR42jRViZIi4PxKam+aAyj2sVjSEe7WCqPHMVX4uOJfF2Xh5UFu1CZAI99F9YzE3EYvjfSe6rkbV6zrgnZuF0xDq5xkpdPmo47cN9Q41b4ZYW3B8v7YWb+/S78bf61fDsF67pYHRmjukPYA5R1oHt7jPPBsjtjah/Ro86RmWzOWqGZdzD02kWwdyMJkk6SCNaX9t0Cg84FjCNA8T4GYEaxHVQ4+z/1TW+/gfPE2k1k8XDwJhO29GbS45N3c='))