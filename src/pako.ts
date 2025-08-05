import { deflate, inflate } from 'pako';

function compress<T extends object>(data: T): string { return btoa(String.fromCharCode(...deflate(JSON.stringify(data)))); };

function decompress() {

};