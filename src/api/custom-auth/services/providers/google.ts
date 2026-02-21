interface GoogleCredentials {
  idToken: string;
  platform: 'android' | 'web';
}

interface ProviderUserInfo {
  providerId: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
}

/**
 * Google Sign-In provider adapter implementing ADR-003.
 * Validates the Google ID token via Google's tokeninfo endpoint
 * and verifies audience against our client ID.
 */
const googleProvider = () => ({
  async validate(credentials: GoogleCredentials): Promise<ProviderUserInfo> {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credentials.idToken)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Invalid Google ID token');
    }

    const claims = await response.json();

    // Verify the token was issued for our application
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && claims.aud !== clientId) {
      throw new Error('Google token audience mismatch — possible token replay attack');
    }

    // Verify issuer
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss)) {
      throw new Error('Invalid Google token issuer');
    }

    // Verify token is not expired
    if (Date.now() / 1000 > Number(claims.exp)) {
      throw new Error('Google token has expired');
    }

    return {
      providerId: claims.sub,
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    };
  },
});

export default googleProvider;
