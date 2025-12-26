/**
 * Google OAuth Handler
 * Phase 1.2 - Authentication System Foundation
 * 
 * Initiates Google OAuth flow by redirecting to Google's authorization page.
 */

const { AUTH_CONFIG } = require('./auth-config');

/**
 * TODO: Implement the following:
 * 1. Generate and store CSRF state token
 * 2. Generate PKCE code_verifier and code_challenge (recommended by Google)
 * 3. Build authorization URL with:
 *    - client_id from env
 *    - redirect_uri from env
 *    - scope: email profile
 *    - state: CSRF token
 *    - code_challenge and code_challenge_method (for PKCE)
 *    - access_type: offline (for refresh tokens)
 *    - prompt: consent (to always show consent screen for refresh token)
 * 4. Store code_verifier in session for callback
 * 5. Redirect user to Google authorization URL
 */

exports.handler = async (event, context) => {
  // TODO: Implement Google OAuth initiation
  
  // Placeholder response
  return {
    statusCode: 501,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'not_implemented',
      message: 'Google OAuth is not yet implemented. See auth-google.js for TODO items.',
      config: {
        scopes: AUTH_CONFIG.google.scopes,
        authorizationUrl: AUTH_CONFIG.google.authorizationUrl,
      },
    }),
  };
};
