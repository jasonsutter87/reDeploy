/**
 * Saved Repositories Endpoint
 * Phase 2.2 - Repository Management API
 *
 * Handles CRUD operations for user's saved repository configurations.
 */

const {
  saveRepoConfig,
  getRepoConfigs,
  updateRepoConfig,
  deleteRepoConfig,
  RepoConfigError,
} = require('./repo-management');

/**
 * Parse user ID from session (placeholder - implement proper session handling)
 */
function getUserId(event) {
  // TODO: Implement proper session/JWT validation
  return event.headers['x-user-id'] || null;
}

/**
 * Main handler for /api/saved-repos endpoint
 */
exports.handler = async (event, _context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-User-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  const userId = getUserId(event);
  if (!userId) {
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'User identification required' }),
    };
  }

  try {
    // GET - List saved repos
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const filters = {};

      if (params.active === 'true') {
        filters.isActive = true;
      } else if (params.active === 'false') {
        filters.isActive = false;
      }

      const configs = await getRepoConfigs(userId, filters);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs,
          total: configs.length,
        }),
      };
    }

    // POST - Add new repo config
    if (event.httpMethod === 'POST') {
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

      const config = await saveRepoConfig(userId, {
        repoId: body.repoId,
        fullName: body.fullName,
        selectedBranches: body.selectedBranches || [body.defaultBranch || 'main'],
        isActive: body.isActive !== false,
      });

      return {
        statusCode: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      };
    }

    // PUT - Update repo config
    if (event.httpMethod === 'PUT') {
      const configId = event.path.split('/').pop();

      if (!configId || configId === 'saved-repos') {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Config ID required' }),
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

      const updates = {};
      if (body.selectedBranches !== undefined) {
        updates.selectedBranches = body.selectedBranches;
      }
      if (body.isActive !== undefined) {
        updates.isActive = body.isActive;
      }

      const config = await updateRepoConfig(userId, configId, updates);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      };
    }

    // DELETE - Remove repo config
    if (event.httpMethod === 'DELETE') {
      const configId = event.path.split('/').pop();

      if (!configId || configId === 'saved-repos') {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Config ID required' }),
        };
      }

      await deleteRepoConfig(userId, configId);

      return {
        statusCode: 204,
        headers: corsHeaders,
      };
    }

    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Saved repos endpoint error:', error);

    if (error instanceof RepoConfigError) {
      const statusMap = {
        DUPLICATE_REPO: 409,
        NOT_FOUND: 404,
        IMMUTABLE_FIELD: 400,
      };

      return {
        statusCode: statusMap[error.code] || 400,
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
