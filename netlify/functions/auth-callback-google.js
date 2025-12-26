/**
 * Google OAuth Callback Handler
 * Phase 1.2 - Authentication System Foundation
 *
 * Handles the callback from Google after user authorization.
 */

// AUTH_CONFIG will be used when implementing token exchange
// eslint-disable-next-line no-unused-vars
const { AUTH_CONFIG } = require('./auth-config');

/**
 * TODO: Implement the following:
 * 1. Validate CSRF state token
 * 2. Extract authorization code from query params
 * 3. Retrieve code_verifier from session (for PKCE)
 * 4. Exchange code for tokens:
 *    - POST to https://oauth2.googleapis.com/token
 *    - Include client_id, client_secret, code, redirect_uri, code_verifier
 *    - Receive access_token, refresh_token, id_token
 * 5. Verify id_token (optional but recommended)
 * 6. Fetch user info from Google API:
 *    - GET https://www.googleapis.com/oauth2/v2/userinfo
 * 7. Create or update user in database
 * 8. Store refresh_token securely for token refresh
 * 9. Generate session token
 * 10. Set secure HTTP-only cookie
 * 11. Redirect to dashboard or original destination
 */

exports.handler = async (event, _context) => {
  const params = event.queryStringParameters || {};
  const code = params.code;
  const state = params.state;
  const error = params.error;
  const errorDescription = params.error_description;

  // Handle OAuth errors from Google
  if (error) {
    const errorMsg = encodeURIComponent(errorDescription || error);
    return {
      statusCode: 302,
      headers: {
        Location: '/login?error=' + errorMsg,
      },
    };
  }

  // TODO: Implement full callback flow

  // Placeholder response
  return {
    statusCode: 501,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'not_implemented',
      message: 'Google OAuth callback is not yet implemented.',
      received: { code: !!code, state: !!state },
    }),
  };
};
