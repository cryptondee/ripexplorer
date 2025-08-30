/**
 * Generate a stable browser fingerprint for user identification
 * This creates a unique identifier based on browser characteristics
 * without storing personally identifiable information
 */

import { browser } from '$app/environment';

interface FingerprintComponents {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  cookieEnabled: boolean;
}

/**
 * Generate browser fingerprint using available browser APIs
 */
export async function generateBrowserFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return 'server-fallback-' + Date.now();
  }

  const components: FingerprintComponents = {
    userAgent: navigator.userAgent || '',
    language: navigator.language || 'unknown',
    platform: navigator.platform || 'unknown',
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    colorDepth: screen.colorDepth || 0,
    pixelRatio: window.devicePixelRatio || 1,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    cookieEnabled: navigator.cookieEnabled || false
  };

  // Add canvas fingerprint (more unique but stable)
  const canvasFingerprint = await getCanvasFingerprint();
  
  // Create fingerprint string
  const fingerprintString = JSON.stringify({
    ...components,
    canvas: canvasFingerprint
  });

  // Hash the fingerprint to create a shorter, stable identifier
  return await hashString(fingerprintString);
}

/**
 * Generate canvas-based fingerprint
 */
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'no-canvas';

    // Draw some shapes and text to create unique canvas signature
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('BrowserFingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Browser fingerprint', 4, 45);

    // Get canvas data
    const dataURL = canvas.toDataURL();
    
    // Return hash of canvas data
    return await hashString(dataURL);
  } catch {
    return 'canvas-error';
  }
}

/**
 * Hash a string using SubtleCrypto (browser-native)
 */
async function hashString(str: string): Promise<string> {
  try {
    // Use SubtleCrypto if available
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback to simple hash
  }

  // Simple hash fallback
  return simpleHash(str);
}

/**
 * Simple hash function fallback
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Check if two fingerprints are similar (for fuzzy matching)
 * This helps handle minor browser changes that shouldn't break authentication
 */
export function fingerprintsSimilar(fp1: string, fp2: string): boolean {
  if (fp1 === fp2) return true;
  
  // Allow for some variation in fingerprints
  // This is a simple similarity check - in production you might want more sophisticated matching
  const similarity = calculateSimilarity(fp1, fp2);
  return similarity > 0.8; // 80% similarity threshold
}

/**
 * Calculate string similarity (Levenshtein distance based)
 */
function calculateSimilarity(s1: string, s2: string): number {
  if (s1.length === 0) return s2.length === 0 ? 1 : 0;
  if (s2.length === 0) return 0;

  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion  
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
}

/**
 * Store fingerprint in sessionStorage for persistence across page reloads
 */
export function storeBrowserFingerprint(fingerprint: string): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('browser_fingerprint', fingerprint);
  }
}

/**
 * Retrieve stored fingerprint or generate new one
 */
export async function getBrowserFingerprint(): Promise<string> {
  // Server-side fallback
  if (!browser || typeof window === 'undefined') {
    return 'server-fallback-' + Date.now();
  }

  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem('browser_fingerprint');
    if (stored) {
      return stored;
    }
  }

  const fingerprint = await generateBrowserFingerprint();
  storeBrowserFingerprint(fingerprint);
  return fingerprint;
}