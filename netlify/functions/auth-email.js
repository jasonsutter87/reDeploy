/**
 * Email/Password Authentication Handler
 * Phase 1.2 - Authentication System Foundation
 *
 * Handles email/password registration and login.
 */

const { AUTH_CONFIG } = require('./auth-config');

/**
 * TODO: Implement the following for registration (POST /register):
 * 1. Validate email format
 * 2. Validate password against requirements from AUTH_CONFIG.email
 * 3. Check if email already exists in database
 * 4. Hash password using bcrypt (cost factor 12)
 * 5. Store user in database with email_verified: false
 * 6. Generate email verification token
 * 7. Send verification email (integrate with email service)
 * 8. Return success response (do not auto-login until verified)
 *
 * TODO: Implement the following for login (POST /login):
 * 1. Validate email and password are provided
 * 2. Look up user by email
 * 3. Compare password hash using bcrypt
 * 4. Check if email is verified
 * 5. Check for account lockout (too many failed attempts)
 * 6. Generate JWT access token and refresh token
 * 7. Set secure HTTP-only cookie with tokens
 * 8. Update last_login timestamp
 * 9. Return user info (without sensitive data)
 *
 * TODO: Implement rate limiting:
 * - 5 failed login attempts = 15 minute lockout
 * - 10 registration attempts per IP per hour
 *
 * TODO: Error handling:
 * - Invalid credentials (do not reveal if email exists)
 * - Account locked
 * - Email not verified
 * - Server errors
 */

exports.handler = async (event, _context) => {
  // These will be used for routing when implemented
  // eslint-disable-next-line no-unused-vars
  const path = event.path;
  // eslint-disable-next-line no-unused-vars
  const method = event.httpMethod;

  // TODO: Route to appropriate handler based on path
  // - POST /.netlify/functions/auth-email/register -> handleRegister
  // - POST /.netlify/functions/auth-email/login -> handleLogin
  // - POST /.netlify/functions/auth-email/verify -> handleVerifyEmail
  // - POST /.netlify/functions/auth-email/forgot-password -> handleForgotPassword
  // - POST /.netlify/functions/auth-email/reset-password -> handleResetPassword

  // Placeholder response
  return {
    statusCode: 501,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'not_implemented',
      message: 'Email authentication is not yet implemented. See auth-email.js for TODO items.',
      supportedRoutes: [
        'POST /register',
        'POST /login',
        'POST /verify',
        'POST /forgot-password',
        'POST /reset-password',
      ],
      config: {
        passwordMinLength: AUTH_CONFIG.email.passwordMinLength,
        accessTokenExpiry: AUTH_CONFIG.email.accessTokenExpiry,
      },
    }),
  };
};

/**
 * TODO: Implement helper functions:
 *
 * async function handleRegister(body) { }
 * async function handleLogin(body) { }
 * async function handleVerifyEmail(body) { }
 * async function handleForgotPassword(body) { }
 * async function handleResetPassword(body) { }
 *
 * function validateEmail(email) { }
 * function validatePassword(password) { }
 * async function hashPassword(password) { }
 * async function comparePassword(password, hash) { }
 * function generateToken(payload, expiry) { }
 * function generateVerificationToken() { }
 */
