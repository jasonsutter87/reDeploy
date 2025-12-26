/**
 * Deployment Groups Endpoint
 * Phase 4.1 - Groups API
 *
 * Handles CRUD operations for deployment groups.
 */

const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addRepoToGroup,
  removeRepoFromGroup,
  GroupError,
} = require('./deployment-groups');

/**
 * Parse user ID from session
 */
function getUserId(event) {
  return event.headers['x-user-id'] || null;
}

/**
 * Main handler for /api/groups endpoint
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

  const pathParts = event.path.split('/').filter(Boolean);
  const groupId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;

  try {
    // GET - List groups or get single group
    if (event.httpMethod === 'GET') {
      if (groupId && groupId !== 'groups') {
        const group = getGroupById(userId, groupId);
        if (!group) {
          return {
            statusCode: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Group not found' }),
          };
        }
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(group),
        };
      }

      const groups = getGroups(userId);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups, total: groups.length }),
      };
    }

    // POST - Create group or add repo to group
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

      // Add repo to existing group
      if (groupId && groupId !== 'groups' && body.action === 'add-repo') {
        const group = addRepoToGroup(userId, groupId, body.repoId);
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(group),
        };
      }

      // Remove repo from group
      if (groupId && groupId !== 'groups' && body.action === 'remove-repo') {
        const group = removeRepoFromGroup(userId, groupId, body.repoId);
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(group),
        };
      }

      // Create new group
      const group = createGroup(userId, {
        name: body.name,
        description: body.description,
        repoIds: body.repoIds,
        color: body.color,
      });

      return {
        statusCode: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      };
    }

    // PUT - Update group
    if (event.httpMethod === 'PUT') {
      if (!groupId || groupId === 'groups') {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Group ID required' }),
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

      const group = updateGroup(userId, groupId, body);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      };
    }

    // DELETE - Delete group
    if (event.httpMethod === 'DELETE') {
      if (!groupId || groupId === 'groups') {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Group ID required' }),
        };
      }

      deleteGroup(userId, groupId);

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
    console.error('Groups endpoint error:', error);

    if (error instanceof GroupError) {
      const statusMap = {
        NOT_FOUND: 404,
        DUPLICATE_NAME: 409,
        MISSING_NAME: 400,
      };

      return {
        statusCode: statusMap[error.code] || 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message, code: error.code }),
      };
    }

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
