/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare global {
  interface Window {
    pkijs: typeof import('pkijs');
    asn1js: typeof import('asn1js');
  }
}

export {};
