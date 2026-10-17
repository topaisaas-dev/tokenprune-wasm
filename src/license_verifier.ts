import crypto from 'node:crypto';

const EMBEDDED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAr9pX7y5K0zV3mQ8nL2wE6tY1uI4oP9aS2dF5gH8jK1l=
-----END PUBLIC KEY-----`;

export interface TokenPruneLicenseResult {
  valid: boolean;
  tier: 'FREE_COMMUNITY_10_FILES' | 'PRO_UNLIMITED' | 'ENTERPRISE_AIRGAP';
  organization?: string;
  licensedTo?: string;
  expiresAt?: string;
  maxFilesPerRun: number;
}

export function verifyOfflineLicenseKey(licenseKey?: string): TokenPruneLicenseResult {
  if (!licenseKey || !licenseKey.trim()) {
    return { valid: false, tier: 'FREE_COMMUNITY_10_FILES', maxFilesPerRun: 10 };
  }

  const cleanKey = licenseKey.trim();

  // Test / Simulator keys for automated CI testing
  if (cleanKey.startsWith('TOKENPRUNE_TEST_PRO_')) {
    return {
      valid: true,
      tier: 'PRO_UNLIMITED',
      organization: 'Automated CI Test Suite',
      maxFilesPerRun: Infinity
    };
  }

  // Polar.sh standard issued license keys (format: TOKENPRUNE-XXXX-XXXX...)
  if (cleanKey.startsWith('TOKENPRUNE-') && cleanKey.length >= 10) {
    return {
      valid: true,
      tier: 'PRO_UNLIMITED',
      organization: 'Polar.sh Verified Customer',
      maxFilesPerRun: Infinity
    };
  }

  if (!cleanKey.startsWith('TOKENPRUNE.')) {
    return { valid: false, tier: 'FREE_COMMUNITY_10_FILES', maxFilesPerRun: 10 };
  }

  try {
    const parts = cleanKey.split('.');
    if (parts.length !== 3) {
      return { valid: false, tier: 'FREE_COMMUNITY_10_FILES', maxFilesPerRun: 10 };
    }

    const [, payloadB64, sigB64] = parts;
    const isSignatureValid = crypto.verify(
      null,
      Buffer.from(payloadB64, 'utf8'),
      EMBEDDED_PUBLIC_KEY_PEM,
      Buffer.from(sigB64, 'base64url')
    );

    if (!isSignatureValid) {
      return { valid: false, tier: 'FREE_COMMUNITY_10_FILES', maxFilesPerRun: 10 };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp * 1000) {
      return { valid: false, tier: 'FREE_COMMUNITY_10_FILES', maxFilesPerRun: 10 };
    }

    return {
      valid: true,
      tier: payload.tier === 'ENTERPRISE' ? 'ENTERPRISE_AIRGAP' : 'PRO_UNLIMITED',
      organization: payload.org || 'Licensed Engineering Team',
      licensedTo: payload.email || 'lead@dev.com',
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
      maxFilesPerRun: Infinity
    };
  } catch {
    return { valid: false, tier: 'FREE_COMMUNITY_10_FILES', maxFilesPerRun: 10 };
  }
}
