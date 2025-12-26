/**
 * Deployment History Endpoint
 * Phase 3.2 - Deployment History API
 *
 * Handles retrieving deployment history and exporting to CSV.
 */

const {
  getDeploymentHistory,
  getDeploymentById,
  getDeploymentStats,
  exportHistoryToCsv,
} = require('./deployment-history');

/**
 * Parse user ID from session
 */
function getUserId(event) {
  return event.headers['x-user-id'] || null;
}

/**
 * Main handler for /api/history endpoint
 */
exports.handler = async (event, _context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-User-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
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

  const params = event.queryStringParameters || {};
  const pathParts = event.path.split('/').filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];

  try {
    // Export to CSV: GET /api/history/export
    if (lastPart === 'export') {
      const filters = {
        status: params.status,
        repo: params.repo,
        fromDate: params.from,
        toDate: params.to,
      };

      const csv = exportHistoryToCsv(userId, filters);

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="deployment-history-${new Date().toISOString().split('T')[0]}.csv"`,
        },
        body: csv,
      };
    }

    // Get stats: GET /api/history/stats
    if (lastPart === 'stats') {
      const filters = {
        fromDate: params.from,
        toDate: params.to,
      };

      const stats = getDeploymentStats(userId, filters);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(stats),
      };
    }

    // Get single deployment: GET /api/history/:id
    if (lastPart && lastPart !== 'history' && lastPart.startsWith('dep_')) {
      const deployment = getDeploymentById(userId, lastPart);

      if (!deployment) {
        return {
          statusCode: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Deployment not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(deployment),
      };
    }

    // Get history list: GET /api/history
    const filters = {
      status: params.status,
      repo: params.repo,
      fromDate: params.from,
      toDate: params.to,
      limit: params.limit ? parseInt(params.limit, 10) : 50,
    };

    const history = getDeploymentHistory(userId, filters);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history,
        total: history.length,
        filters: {
          status: filters.status || null,
          repo: filters.repo || null,
          from: filters.fromDate || null,
          to: filters.toDate || null,
        },
      }),
    };
  } catch (error) {
    console.error('History endpoint error:', error);

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
