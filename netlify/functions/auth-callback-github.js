/**
 * GitHub OAuth Callback Handler
 * Phase 1.2 - Authentication System Foundation
 *
 * Handles the callback from GitHub after user authorization.
 */

// AUTH_CONFIG will be used when implementing token exchange
// eslint-disable-next-line no-unused-vars
const { AUTH_CONFIG } = require('./auth-config');

/**
 * TODO: Implement the following:
 * 1. Validate CSRF state token from query params against session
 * 2. Extract authorization code from query params
 * 3. Exchange code for access token:
 *    - POST to https://github.com/login/oauth/access_token
 *    - Include client_id, client_secret, code, redirect_uri
 * 4. Fetch user info from GitHub API:
 *    - GET https://api.github.com/user (basic info)
 *    - GET https://api.github.com/user/emails (email addresses)
 * 5. Create or update user in database
 * 6. Generate session token
 * 7. Set secure HTTP-only cookie
 * 8. Redirect to dashboard or original destination
 * 9. Handle errors:
 *    - Invalid state (CSRF attack)
 *    - Token exchange failure
 *    - User info fetch failure
 *    - Database errors
 */

exports.handler = async (event, _context) => {
  const params = event.queryStringParameters || {};
  const code = params.code;
  const state = params.state;
  const error = params.error;
  const errorDescription = params.error_description;

  // Handle OAuth errors from GitHub
  if (error) {
    // TODO: Log error for monitoring
    const errorMsg = encodeURIComponent(errorDescription || error);
    return {
      statusCode: 302,
      headers: {
        Location: '/login?error=' + errorMsg,
      },
    };
  }

  // TODO: Validate state parameter (CSRF protection)
  // TODO: Exchange code for token
  // TODO: Fetch user info
  // TODO: Create session

  // Placeholder response
  return {
    statusCode: 501,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'not_implemented',
      message: 'GitHub OAuth callback is not yet implemented.',
      received: { code: !!code, state: !!state },
    }),
  };
};
