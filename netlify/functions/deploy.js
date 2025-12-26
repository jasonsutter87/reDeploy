/**
 * Deploy Endpoint
 * Phase 2.3 - Deployment API
 *
 * Handles deployment requests to trigger rebuilds across repositories.
 */

const {
  triggerDeployment,
  triggerBatchDeployment,
  DeploymentError,
} = require('./deployment-trigger');
const { getRepoConfigs } = require('./repo-management');

/**
 * Extract GitHub token from request
 */
function extractToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Parse user ID from session (placeholder - implement proper session handling)
 */
function getUserId(event) {
  // TODO: Implement proper session/JWT validation
  // For now, use a header for testing
  return event.headers['x-user-id'] || null;
}

/**
 * Main handler for /api/deploy endpoint
 */
exports.handler = async (event, _context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-User-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const token = extractToken(event);
  if (!token) {
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Authorization required' }),
    };
  }

  const userId = getUserId(event);
  if (!userId) {
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'User identification required' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  try {
    const { action, repos, configIds, message } = body;

    // Deploy all configured repos
    if (action === 'deploy-all') {
      const configs = await getRepoConfigs(userId, { isActive: true });

      if (configs.length === 0) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No active repositories configured' }),
        };
      }

      const repoList = configs.map((c) => {
        const [owner, repo] = c.fullName.split('/');
        return { owner, repo, branches: c.selectedBranches, message };
      });

      const result = await triggerBatchDeployment(token, repoList);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    // Deploy specific configs by ID
    if (action === 'deploy-selected' && configIds && configIds.length > 0) {
      const allConfigs = await getRepoConfigs(userId);
      const selectedConfigs = allConfigs.filter((c) => configIds.includes(c.id));

      if (selectedConfigs.length === 0) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No matching configurations found' }),
        };
      }

      const repoList = selectedConfigs.map((c) => {
        const [owner, repo] = c.fullName.split('/');
        return { owner, repo, branches: c.selectedBranches, message };
      });

      const result = await triggerBatchDeployment(token, repoList);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    // Deploy directly specified repos (for advanced use)
    if (repos && repos.length > 0) {
      const repoList = repos.map((r) => ({
        owner: r.owner,
        repo: r.repo,
        branches: r.branches || ['main'],
        message,
      }));

      const result = await triggerBatchDeployment(token, repoList);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    // Single repo deployment
    if (body.owner && body.repo) {
      const result = await triggerDeployment(token, {
        owner: body.owner,
        repo: body.repo,
        branches: body.branches || ['main'],
        message,
      });

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Invalid request',
        usage: {
          'deploy-all': { action: 'deploy-all' },
          'deploy-selected': { action: 'deploy-selected', configIds: ['id1', 'id2'] },
          'direct-repos': { repos: [{ owner: 'user', repo: 'name', branches: ['main'] }] },
          'single-repo': { owner: 'user', repo: 'name', branches: ['main'] },
        },
      }),
    };
  } catch (error) {
    console.error('Deploy endpoint error:', error);

    if (error instanceof DeploymentError) {
      return {
        statusCode: error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          code: error.code,
        }),
      };
    }

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
    };
  }
};
