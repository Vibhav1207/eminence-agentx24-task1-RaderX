export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateOutboundUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, reason: 'URL is empty or invalid type' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'Malformed URL structure' };
  }

  // Scheme Check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `Disallowed protocol scheme: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Localhost & Loopback Check
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname === '0.0.0.0'
  ) {
    return { valid: false, reason: 'Blocked loopback address' };
  }

  // Cloud Metadata Endpoint Check
  if (hostname === '169.254.169.254' || hostname.includes('metadata.google.internal')) {
    return { valid: false, reason: 'Blocked cloud metadata address' };
  }

  // Private Subnet IP Check (10.x, 192.168.x, 172.16-31.x)
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
    return { valid: false, reason: 'Blocked private RFC1918 IP address' };
  }

  return { valid: true };
}
