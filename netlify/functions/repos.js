/**
 * Repositories Endpoint
 * Phase 2.1 - GitHub Integration
 *
 * Handles fetching user's GitHub repositories with caching
 */

const { fetchAllUserRepos, fetchRepoBranches, GitHubApiError } = require('./github-api');

// Simple in-memory cache (will be replaced with Redis/KV in production)
const repoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data if valid
 */
function getCached(key) {
  const cached = repoCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * Set cache data
 */
function setCache(key, data) {
  repoCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear cache for a user
 */
function clearCache(userId) {
  for (const key of repoCache.keys()) {
    if (key.startsWith(userId)) {
      repoCache.delete(key);
    }
  }
}

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
 * Main handler for /api/repos endpoint
 */
exports.handler = async (event, _context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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

  const token = extractToken(event);
  if (!token) {
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Authorization required' }),
    };
  }

  const params = event.queryStringParameters || {};
  const forceRefresh = params.refresh === 'true';
  const search = params.search?.toLowerCase() || '';
  const branch = params.branch; // Optional: fetch branches for specific repo

  try {
    // If requesting branches for a specific repo
    if (params.owner && params.repo) {
      const cacheKey = `branches:${params.owner}/${params.repo}`;
      let branches = forceRefresh ? null : getCached(cacheKey);

      if (!branches) {
        branches = await fetchRepoBranches(token, params.owner, params.repo);
        setCache(cacheKey, branches);
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ branches }),
      };
    }

    // Fetch all repos
    const cacheKey = `repos:${token.substring(0, 8)}`; // Use token prefix as cache key
    let repos = forceRefresh ? null : getCached(cacheKey);

    if (!repos) {
      repos = await fetchAllUserRepos(token, { maxPages: 10 });
      setCache(cacheKey, repos);
    }

    // Apply search filter if provided
    let filteredRepos = repos;
    if (search) {
      filteredRepos = repos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(search) ||
          repo.full_name.toLowerCase().includes(search) ||
          (repo.description && repo.description.toLowerCase().includes(search))
      );
    }

    // Transform response for frontend
    const response = filteredRepos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      defaultBranch: repo.default_branch,
      private: repo.private,
      url: repo.html_url,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      language: repo.language,
      stars: repo.stargazers_count,
    }));

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repos: response,
        total: repos.length,
        filtered: filteredRepos.length,
        cached: !forceRefresh && getCached(cacheKey) !== null,
      }),
    };
  } catch (error) {
    console.error('Repos endpoint error:', error);

    if (error instanceof GitHubApiError) {
      return {
        statusCode: error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          code: 'GITHUB_API_ERROR',
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

// Export helpers for testing
module.exports.getCached = getCached;
module.exports.setCache = setCache;
module.exports.clearCache = clearCache;
