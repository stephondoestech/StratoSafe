import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { User } from '../models/User';

export class MfaService {
  /**
   * Generate a new TOTP secret for a user
   */
  static generateSecret(_email: string): string {
    return authenticator.generateSecret();
  }

  /**
   * Generate the TOTP URI for QR code generation
   */
  static generateTotpUri(email: string, secret: string): string {
    return authenticator.keyuri(email, 'StratoSafe', secret);
  }

  /**
   * Generate a QR code data URL for the TOTP URI
   */
  static async generateQrCode(totpUri: string): Promise<string> {
    try {
      return await QRCode.toDataURL(totpUri);
    } catch (_error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate a TOTP token for testing purposes
   */
  static generateToken(secret: string): string {
    return authenticator.generate(secret);
  }

  /**
   * Verify a TOTP token against a user's secret
   */
  static verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (_error) {
      return false;
    }
  }

  /**
   * Enable MFA for a user
   */
  static async setupMfa(user: User, token: string): Promise<boolean> {
    // Verify the provided token against the temporary secret
    if (!user.mfaSecret || !this.verifyToken(token, user.mfaSecret)) {
      return false;
    }

    // Generate backup codes
    await user.generateBackupCodes();

    // Enable MFA
    user.mfaEnabled = true;

    return true;
  }

  /**
   * Disable MFA for a user
   */
  static disableMfa(user: User): void {
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaBackupCodes = undefined;
  }
}
