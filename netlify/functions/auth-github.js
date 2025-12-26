/**
 * GitHub OAuth Handler
 * Phase 1.2 - Authentication System Foundation
 * 
 * Initiates GitHub OAuth flow by redirecting to GitHub's authorization page.
 */

const { AUTH_CONFIG } = require('./auth-config');

/**
 * TODO: Implement the following:
 * 1. Generate and store CSRF state token in session/cookie
 * 2. Build authorization URL with:
 *    - client_id from env
 *    - redirect_uri from env
 *    - scope: repo, user:email
 *    - state: CSRF token
 * 3. Redirect user to GitHub authorization URL
 * 4. Handle errors gracefully with user-friendly messages
 */

exports.handler = async (event, context) => {
  // TODO: Implement GitHub OAuth initiation
  
  // Placeholder response for structure verification
  return {
    statusCode: 501,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'not_implemented',
      message: 'GitHub OAuth is not yet implemented. See auth-github.js for TODO items.',
      config: {
        scopes: AUTH_CONFIG.github.scopes,
        authorizationUrl: AUTH_CONFIG.github.authorizationUrl,
      },
    }),
  };
};
