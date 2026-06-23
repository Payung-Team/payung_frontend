/**
 * Dynamically loads Omise.js from the official CDN when first called,
 * then reuses the already-loaded instance on subsequent calls.
 *
 * Loading at runtime (not as a static <script> tag) keeps the bundle lean
 * and avoids Subresource Integrity (SRI) issues — Omise rotates the CDN
 * file without publishing hashes.
 */

const OMISE_JS_URL = 'https://cdn.omise.co/omise.js';

let loadPromise: Promise<void> | null = null;

export function loadOmiseJs(): Promise<void> {
  // Already loaded
  if (typeof window !== 'undefined' && window.Omise) return Promise.resolve();

  // Already in progress
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = OMISE_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null; // allow retry on next call
      reject(new Error('ไม่สามารถโหลด Omise.js ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
