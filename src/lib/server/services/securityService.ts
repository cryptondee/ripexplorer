import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma as db } from '../db/client.js';
import type { SecureUserSession } from '@prisma/client';

// Security configuration
const BCRYPT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRY = '24h';
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 30;
const AES_ALGORITHM = 'aes-256-gcm';

export interface SessionValidationResult {
  valid: boolean;
  session?: SecureUserSession;
  error?: string;
}

export interface PinValidationResult {
  valid: boolean;
  sessionToken?: string;
  error?: string;
  rateLimited?: boolean;
  lockoutEnd?: Date;
}

export class SecurityService {
  
  /**
   * Hash a PIN with bcrypt and unique salt
   */
  static async hashPin(pin: string): Promise<{ hash: string; salt: string }> {
    if (!pin || pin.length < 4 || pin.length > 6) {
      throw new Error('PIN must be 4-6 digits');
    }
    
    if (!/^\d+$/.test(pin)) {
      throw new Error('PIN must contain only digits');
    }
    
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hash = await bcrypt.hash(pin, salt);
    
    return { hash, salt };
  }
  
  /**
   * Verify PIN against stored hash
   */
  static async verifyPin(pin: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(pin, hash);
    } catch (error) {
      console.error('PIN verification error:', error);
      return false;
    }
  }
  
  /**
   * Generate AES-256 encryption key
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }
  
  /**
   * Encrypt user data with AES-256-GCM
   */
  static encryptUserData(data: any, encryptionKey: string): string {
    try {
      const key = Buffer.from(encryptionKey, 'base64');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');
      
      // Combine iv + authTag + encrypted data
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt user data with AES-256-GCM
   */
  static decryptUserData(encryptedData: string, encryptionKey: string): any {
    try {
      const key = Buffer.from(encryptionKey, 'base64');
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Generate JWT session token
   */
  static generateSessionToken(sessionId: string, username: string): string {
    const payload = {
      sessionId,
      username,
      iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }
  
  /**
   * Verify JWT session token
   */
  static verifySessionToken(token: string): { sessionId: string; username: string } | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      return {
        sessionId: payload.sessionId,
        username: payload.username
      };
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }
  
  /**
   * Check if user is rate limited
   */
  static async isRateLimited(username: string, browserFingerprint: string): Promise<{
    isLimited: boolean;
    lockoutEnd?: Date;
  }> {
    try {
      const session = await db.secureUserSession.findUnique({
        where: {
          browserFingerprint_claimedUsername: {
            browserFingerprint,
            claimedUsername: username
          }
        }
      });
      
      if (!session) {
        return { isLimited: false };
      }
      
      // Check if currently locked out
      if (session.lockedUntil && session.lockedUntil > new Date()) {
        return {
          isLimited: true,
          lockoutEnd: session.lockedUntil
        };
      }
      
      // Check if too many recent attempts
      if (session.failedAttempts >= RATE_LIMIT_ATTEMPTS) {
        const lockoutEnd = new Date(Date.now() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
        
        // Update lockout time
        await db.secureUserSession.update({
          where: { id: session.id },
          data: { lockedUntil: lockoutEnd }
        });
        
        return {
          isLimited: true,
          lockoutEnd
        };
      }
      
      return { isLimited: false };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { isLimited: false };
    }
  }
  
  /**
   * Record failed authentication attempt
   */
  static async recordFailedAttempt(username: string, browserFingerprint: string): Promise<void> {
    try {
      await db.secureUserSession.upsert({
        where: {
          browserFingerprint_claimedUsername: {
            browserFingerprint,
            claimedUsername: username
          }
        },
        update: {
          failedAttempts: {
            increment: 1
          },
          lastFailedAttempt: new Date()
        },
        create: {
          browserFingerprint,
          claimedUsername: username,
          pinHash: '', // Will be set when user successfully creates account
          salt: '',
          encryptionKey: '',
          failedAttempts: 1,
          lastFailedAttempt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to record failed attempt:', error);
    }
  }
  
  /**
   * Reset failed attempts counter
   */
  static async resetFailedAttempts(sessionId: string): Promise<void> {
    try {
      await db.secureUserSession.update({
        where: { id: sessionId },
        data: {
          failedAttempts: 0,
          lastFailedAttempt: null,
          lockedUntil: null
        }
      });
    } catch (error) {
      console.error('Failed to reset attempts:', error);
    }
  }
  
  /**
   * Create new secure user session
   */
  static async createSecureSession(
    username: string,
    pin: string,
    browserFingerprint: string
  ): Promise<PinValidationResult> {
    try {
      // Check rate limiting
      const rateLimitResult = await this.isRateLimited(username, browserFingerprint);
      if (rateLimitResult.isLimited) {
        return {
          valid: false,
          error: 'Too many failed attempts. Please try again later.',
          rateLimited: true,
          lockoutEnd: rateLimitResult.lockoutEnd
        };
      }
      
      // Hash PIN and generate encryption key
      const { hash, salt } = await this.hashPin(pin);
      const encryptionKey = this.generateEncryptionKey();
      
      // Create session record
      const session = await db.secureUserSession.create({
        data: {
          browserFingerprint,
          claimedUsername: username,
          pinHash: hash,
          salt,
          encryptionKey,
          failedAttempts: 0
        }
      });
      
      // Generate session token
      const sessionToken = this.generateSessionToken(session.id, username);
      
      // Update session with token
      await db.secureUserSession.update({
        where: { id: session.id },
        data: {
          sessionToken,
          tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });
      
      return {
        valid: true,
        sessionToken
      };
      
    } catch (error) {
      console.error('Session creation error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return {
        valid: false,
        error: 'Failed to create secure session'
      };
    }
  }
  
  /**
   * Validate existing session and PIN
   */
  static async validatePin(
    username: string,
    pin: string,
    browserFingerprint: string
  ): Promise<PinValidationResult> {
    try {
      // Check rate limiting
      const rateLimitResult = await this.isRateLimited(username, browserFingerprint);
      if (rateLimitResult.isLimited) {
        return {
          valid: false,
          error: 'Too many failed attempts. Please try again later.',
          rateLimited: true,
          lockoutEnd: rateLimitResult.lockoutEnd
        };
      }
      
      // Find existing session
      const session = await db.secureUserSession.findUnique({
        where: {
          browserFingerprint_claimedUsername: {
            browserFingerprint,
            claimedUsername: username
          }
        }
      });
      
      if (!session) {
        return {
          valid: false,
          error: 'No account found for this profile'
        };
      }
      
      // Verify PIN
      const pinValid = await this.verifyPin(pin, session.pinHash);
      
      if (!pinValid) {
        // Record failed attempt
        await this.recordFailedAttempt(username, browserFingerprint);
        return {
          valid: false,
          error: 'Invalid PIN'
        };
      }
      
      // Generate new session token
      const sessionToken = this.generateSessionToken(session.id, username);
      
      // Update session
      await db.secureUserSession.update({
        where: { id: session.id },
        data: {
          sessionToken,
          tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
          lastSeen: new Date()
        }
      });
      
      // Reset failed attempts
      await this.resetFailedAttempts(session.id);
      
      return {
        valid: true,
        sessionToken
      };
      
    } catch (error) {
      console.error('PIN validation error:', error);
      return {
        valid: false,
        error: 'Authentication failed'
      };
    }
  }
  
  /**
   * Validate session token and return session data
   */
  static async validateSession(sessionToken: string): Promise<SessionValidationResult> {
    try {
      // Verify JWT
      const tokenPayload = this.verifySessionToken(sessionToken);
      if (!tokenPayload) {
        return {
          valid: false,
          error: 'Invalid session token'
        };
      }
      
      // Find session in database
      const session = await db.secureUserSession.findUnique({
        where: {
          id: tokenPayload.sessionId
        }
      });
      
      if (!session) {
        return {
          valid: false,
          error: 'Session not found'
        };
      }
      
      // Check if token matches and hasn't expired
      if (session.sessionToken !== sessionToken || 
          (session.tokenExpiry && session.tokenExpiry < new Date())) {
        return {
          valid: false,
          error: 'Session expired'
        };
      }
      
      // Update last seen
      await db.secureUserSession.update({
        where: { id: session.id },
        data: { lastSeen: new Date() }
      });
      
      return {
        valid: true,
        session
      };
      
    } catch (error) {
      console.error('Session validation error:', error);
      return {
        valid: false,
        error: 'Session validation failed'
      };
    }
  }
  
  /**
   * Revoke session token (logout)
   */
  static async revokeSession(sessionToken: string): Promise<boolean> {
    try {
      const tokenPayload = this.verifySessionToken(sessionToken);
      if (!tokenPayload) {
        return false;
      }
      
      await db.secureUserSession.update({
        where: { id: tokenPayload.sessionId },
        data: {
          sessionToken: null,
          tokenExpiry: null
        }
      });
      
      return true;
    } catch (error) {
      console.error('Session revocation error:', error);
      return false;
    }
  }
  
  /**
   * Refresh session token if near expiry
   */
  static async refreshSession(sessionId: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
    try {
      // Find the session
      const session = await db.secureUserSession.findUnique({
        where: { id: sessionId }
      });
      
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }
      
      // Generate new session token
      const newSessionToken = this.generateSessionToken(session.id, session.claimedUsername);
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Update session with new token and expiry
      await db.secureUserSession.update({
        where: { id: session.id },
        data: {
          sessionToken: newSessionToken,
          tokenExpiry: newExpiry,
          lastSeen: new Date()
        }
      });
      
      console.log(`Session refreshed for user: ${session.claimedUsername}`);
      
      return {
        success: true,
        sessionToken: newSessionToken
      };
      
    } catch (error) {
      console.error('Session refresh error:', error);
      return {
        success: false,
        error: 'Session refresh failed'
      };
    }
  }
}

export default SecurityService;