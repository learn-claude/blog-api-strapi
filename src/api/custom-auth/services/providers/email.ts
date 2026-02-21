import crypto from 'crypto';

interface EmailCredentials {
  email: string;
  otp: string;
}

interface ProviderUserInfo {
  providerId: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Email + OTP provider adapter implementing ADR-003.
 * Validates a 6-digit OTP code against the hashed value stored in the DB.
 *
 * Security properties:
 * - OTP expires in 10 minutes
 * - Maximum 3 attempts before invalidation (brute-force protection)
 * - OTP is marked used after successful validation (replay-attack prevention)
 * - Attempt counter incremented on invalid attempt
 */
const emailProvider = ({ strapi }) => ({
  async validate(credentials: EmailCredentials): Promise<ProviderUserInfo> {
    const codeHash = this.hashOtp(credentials.otp);

    // Fetch OTP record (only unused ones to prevent replay attacks)
    const otpRecord = await strapi.db.query('api::otp-code.otp-code').findOne({
      where: {
        email: credentials.email,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new Error('No active OTP found for this email. Please request a new code.');
    }

    // Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      throw new Error('This code has expired. Please request a new code.');
    }

    // Check attempt limit
    if (otpRecord.attempt_count >= 3) {
      throw new Error('Too many incorrect attempts. Please request a new code.');
    }

    // Validate the code hash
    if (otpRecord.code_hash !== codeHash) {
      // Increment attempt counter — must happen before throwing
      await strapi.db.query('api::otp-code.otp-code').update({
        where: { id: otpRecord.id },
        data: { attempt_count: otpRecord.attempt_count + 1 },
      });

      const attemptsRemaining = 3 - (otpRecord.attempt_count + 1);
      throw new Error(
        attemptsRemaining > 0
          ? `Invalid code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new code.'
      );
    }

    // Mark OTP as used to prevent replay attacks
    await strapi.db.query('api::otp-code.otp-code').update({
      where: { id: otpRecord.id },
      data: { used: true, used_at: new Date() },
    });

    return {
      providerId: credentials.email,
      email: credentials.email,
      emailVerified: true,
    };
  },

  /**
   * Generate a 6-digit OTP and store its SHA-256 hash.
   * Returns the plain-text OTP to be sent via email.
   */
  async generateAndStore(email: string): Promise<string> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const codeHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await strapi.db.query('api::otp-code.otp-code').create({
      data: {
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
        attempt_count: 0,
        used: false,
      },
    });

    return otp;
  },

  hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  },

  /**
   * Check whether a new OTP can be requested (rate limit: 5 per hour).
   */
  async isRateLimited(email: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await strapi.db.query('api::otp-code.otp-code').count({
      where: {
        email,
        createdAt: { $gte: oneHourAgo },
      },
    });
    return recentCount >= 5;
  },
});

export default emailProvider;
