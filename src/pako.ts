import { deflate, inflate } from 'pako';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

// Node.js 実行時だけ dotenv を読み込む
const isVite = typeof import.meta !== 'undefined' && 'env' in import.meta;
if (!isVite) dotenv.config();

const SECRET_KEY = isVite
  ? import.meta.env.VITE_SECRET_KEY
  : process.env.VITE_SECRET_KEY;

export function compress<T extends object>(data: T): string {
  const json = JSON.stringify(data);
  const binary = deflate(json);
  let str = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < binary.length; i += chunkSize) {
    str += String.fromCharCode(...binary.subarray(i, i + chunkSize));
  }
  return CryptoJS.AES.encrypt(btoa(str), SECRET_KEY).toString()
}

export function decompress<T extends object>(base64: string): T {
  const binaryString = atob(CryptoJS.AES.decrypt(base64, SECRET_KEY).toString(CryptoJS.enc.Utf8));
  const len = binaryString.length;
  const binary = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    binary[i] = binaryString.charCodeAt(i);
  }
  const json = inflate(binary, { to: 'string' });
  return JSON.parse(json) as T;
}

const text = compress({name: '加地'});
console.log(text);
console.log(decompress(text));