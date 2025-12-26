/**
 * GitHub API Integration
 * Phase 2.1 - Core GitHub API functionality
 *
 * Handles all GitHub API interactions for fetching repos,
 * branches, and user information.
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Custom error class for GitHub API errors
 */
class GitHubApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Parse GitHub Link header for pagination info
 * @param {string} linkHeader - Link header from GitHub API response
 * @returns {Object} Pagination info with hasNext, nextPage, lastPage
 */
function parseLinkHeader(linkHeader) {
  if (!linkHeader) {
    return { hasNext: false, nextPage: null, lastPage: null };
  }

  const links = {};
  const parts = linkHeader.split(',');

  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      const url = match[1];
      const rel = match[2];
      const pageMatch = url.match(/[?&]page=(\d+)/);
      if (pageMatch) {
        links[rel] = parseInt(pageMatch[1], 10);
      }
    }
  }

  return {
    hasNext: !!links.next,
    nextPage: links.next || null,
    lastPage: links.last || null,
  };
}

/**
 * Make authenticated request to GitHub API
 * @param {string} url - API endpoint URL
 * @param {string} token - GitHub access token
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function githubFetch(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'reDeploy-App',
      ...options.headers,
    },
  });

  return response;
}

/**
 * Validate a GitHub access token
 * @param {string} token - GitHub access token
 * @returns {Promise<{valid: boolean, login?: string, error?: string}>}
 */
async function validateGitHubToken(token) {
  const response = await githubFetch(`${GITHUB_API_BASE}/user`, token);

  if (response.ok) {
    const data = await response.json();
    return { valid: true, login: data.login };
  }

  const error = await response.json();
  return { valid: false, error: error.message };
}

/**
 * Fetch user's repositories with pagination
 * @param {string} token - GitHub access token
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.perPage - Items per page (default: 30, max: 100)
 * @param {string} options.type - Filter by type: all, owner, public, private, member
 * @param {string} options.sort - Sort by: created, updated, pushed, full_name
 * @param {string} options.direction - Sort direction: asc, desc
 * @returns {Promise<{repos: Array, pagination: Object}>}
 */
async function fetchUserRepos(token, options = {}) {
  const { page = 1, perPage = 30, type = 'all', sort = 'updated', direction = 'desc' } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    type,
    sort,
    direction,
  });

  const url = `${GITHUB_API_BASE}/user/repos?${params}`;
  const response = await githubFetch(url, token);

  if (!response.ok) {
    const error = await response.json();
    throw new GitHubApiError(error.message, response.status, error);
  }

  const repos = await response.json();
  const linkHeader = response.headers.get('link') || response.headers.get('Link') || '';
  const pagination = parseLinkHeader(linkHeader);

  return { repos, pagination };
}

/**
 * Fetch all user repositories across all pages
 * @param {string} token - GitHub access token
 * @param {Object} options - Query options
 * @param {number} options.maxPages - Maximum pages to fetch (default: 10)
 * @returns {Promise<Array>} All repositories
 */
async function fetchAllUserRepos(token, options = {}) {
  const { maxPages = 10, ...queryOptions } = options;
  const allRepos = [];
  let currentPage = 1;

  while (currentPage <= maxPages) {
    const { repos, pagination } = await fetchUserRepos(token, {
      ...queryOptions,
      page: currentPage,
      perPage: 100,
    });

    allRepos.push(...repos);

    if (!pagination.hasNext) {
      break;
    }

    currentPage++;
  }

  return allRepos;
}

/**
 * Fetch branches for a specific repository
 * @param {string} token - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} List of branches
 */
async function fetchRepoBranches(token, owner, repo) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches`;
  const response = await githubFetch(url, token);

  if (!response.ok) {
    const error = await response.json();
    throw new GitHubApiError(error.message, response.status, error);
  }

  return response.json();
}

/**
 * Get rate limit status
 * @param {string} token - GitHub access token
 * @returns {Promise<Object>} Rate limit info
 */
async function getRateLimit(token) {
  const response = await githubFetch(`${GITHUB_API_BASE}/rate_limit`, token);

  if (!response.ok) {
    const error = await response.json();
    throw new GitHubApiError(error.message, response.status, error);
  }

  return response.json();
}

module.exports = {
  GitHubApiError,
  validateGitHubToken,
  fetchUserRepos,
  fetchAllUserRepos,
  fetchRepoBranches,
  getRateLimit,
  parseLinkHeader,
  GITHUB_API_BASE,
};
