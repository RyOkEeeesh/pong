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
console.log(decompress('U2FsdGVkX1/iLBPDAX+UGm5I9Pe5a5J51ZT1OEQBzlHxr+ai1up2bLK7TfqHAx1aFVKmdXgegr1ATfp8ztb93laALh8fNCdBXMR1IU3mmvXVaFAb1udC1FDt5kPPifujvO+DB0Wf6pwmE9S1YuVrcaSqUOceJdN23FVhpsV7BKHcgJBxiesh1qJ46x1/ZyO89nNJDVWnmvhGx2HuoTHRD6aA/qAJXeTj0ZdXKEHMJySCNj0OnRgXqmfp6sTWMZMvlGMc83eckShon/s8telo+myDpaAXZ07VGGVByK5UxS4='));