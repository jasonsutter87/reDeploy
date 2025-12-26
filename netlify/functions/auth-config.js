/**
 * Auth Configuration for reDeploy
 * Phase 1.2 - Authentication System Foundation
 *
 * This file contains configuration for all authentication providers.
 * Environment variables should be set in Netlify dashboard.
 */

const AUTH_CONFIG = {
  /**
   * GitHub OAuth Configuration
   * Scopes: repo (for deployment triggers), user:email (for user identification)
   *
   * Required env vars:
   * - GITHUB_CLIENT_ID
   * - GITHUB_CLIENT_SECRET
   * - GITHUB_REDIRECT_URI (e.g., https://redeploy.app/.netlify/functions/auth-callback-github)
   */
  github: {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    userEmailUrl: 'https://api.github.com/user/emails',
    scopes: ['repo', 'user:email'],
    // TODO: Add rate limiting configuration
    // TODO: Add token refresh handling (GitHub tokens don't expire but can be revoked)
  },

  /**
   * Google OAuth Configuration
   * Scopes: email, profile (basic user info)
   *
   * Required env vars:
   * - GOOGLE_CLIENT_ID
   * - GOOGLE_CLIENT_SECRET
   * - GOOGLE_REDIRECT_URI (e.g., https://redeploy.app/.netlify/functions/auth-callback-google)
   */
  google: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['email', 'profile'],
    // TODO: Implement token refresh using refresh_token
    // TODO: Add PKCE support for enhanced security
  },

  /**
   * Email/Password Authentication Configuration
   * Uses secure password hashing (bcrypt) and JWT tokens
   *
   * Required env vars:
   * - JWT_SECRET (for signing tokens)
   * - SESSION_SECRET (for session management)
   */
  email: {
    // Password requirements
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: false, // Optional for better UX

    // Token configuration
    accessTokenExpiry: '15m', // Short-lived access tokens
    refreshTokenExpiry: '7d', // Longer refresh tokens

    // TODO: Implement email verification flow
    // TODO: Implement password reset flow
    // TODO: Add rate limiting for login attempts
    // TODO: Add account lockout after failed attempts
  },

  /**
   * Session Configuration
   *
   * Required env vars:
   * - SESSION_SECRET
   */
  session: {
    cookieName: 'redeploy_session',
    cookieSecure: true, // HTTPS only in production
    cookieHttpOnly: true, // Not accessible via JavaScript
    cookieSameSite: 'lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },

  /**
   * Security Configuration
   */
  security: {
    // CORS origins (update for production)
    allowedOrigins: [
      'https://redeploy.app',
      'http://localhost:1313', // Hugo dev server
    ],

    // TODO: Implement CSRF token validation
    // TODO: Add request signing for API calls
    // TODO: Implement audit logging for auth events
  },
};

module.exports = { AUTH_CONFIG };
