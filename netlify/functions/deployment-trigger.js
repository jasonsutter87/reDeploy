/**
 * Deployment Trigger
 * Phase 2.3 - Core Deployment Functionality
 *
 * Creates empty commits to trigger CI/CD rebuilds across repositories.
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Custom error class for deployment errors
 */
class DeploymentError extends Error {
  constructor(message, code = 'DEPLOY_ERROR', status = 500) {
    super(message);
    this.name = 'DeploymentError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Make authenticated request to GitHub API
 */
async function githubFetch(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'reDeploy-App',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response;
}

/**
 * Generate commit message with timestamp
 */
function generateCommitMessage() {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
  return `chore: trigger rebuild [${timestamp}]`;
}

/**
 * Create an empty commit on a repository branch
 *
 * Uses the GitHub Git Data API to create a commit without changing files:
 * 1. Get the current commit SHA of the branch
 * 2. Get the tree SHA from that commit
 * 3. Create a new commit with the same tree (empty commit)
 * 4. Update the branch reference to point to the new commit
 *
 * @param {string} token - GitHub access token
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name
 * @param {Object} options - Optional settings
 * @param {string} options.message - Custom commit message
 * @returns {Promise<Object>} Commit result
 */
async function createEmptyCommit(token, owner, repo, branch, options = {}) {
  const message = options.message || generateCommitMessage();

  // Step 1: Get the current commit SHA of the branch
  const refUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  const refResponse = await githubFetch(refUrl, token);

  if (!refResponse.ok) {
    const error = await refResponse.json();
    throw new DeploymentError(
      error.message || 'Failed to get branch reference',
      'REF_NOT_FOUND',
      refResponse.status
    );
  }

  const refData = await refResponse.json();
  const currentCommitSha = refData.object.sha;

  // Step 2: Get the tree SHA from the current commit
  const commitUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${currentCommitSha}`;
  const commitResponse = await githubFetch(commitUrl, token);

  if (!commitResponse.ok) {
    const error = await commitResponse.json();
    throw new DeploymentError(
      error.message || 'Failed to get commit data',
      'COMMIT_NOT_FOUND',
      commitResponse.status
    );
  }

  const commitData = await commitResponse.json();
  const treeSha = commitData.tree.sha;

  // Step 3: Create a new commit with the same tree (empty commit)
  const newCommitUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`;
  const newCommitResponse = await githubFetch(newCommitUrl, token, {
    method: 'POST',
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [currentCommitSha],
    }),
  });

  if (!newCommitResponse.ok) {
    const error = await newCommitResponse.json();
    throw new DeploymentError(
      error.message || 'Failed to create commit',
      'COMMIT_CREATE_FAILED',
      newCommitResponse.status
    );
  }

  const newCommitData = await newCommitResponse.json();

  // Step 4: Update the branch reference to point to the new commit
  const updateRefUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`;
  const updateRefResponse = await githubFetch(updateRefUrl, token, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: newCommitData.sha,
      force: false,
    }),
  });

  if (!updateRefResponse.ok) {
    const error = await updateRefResponse.json();
    throw new DeploymentError(
      error.message || 'Failed to update branch reference',
      'REF_UPDATE_FAILED',
      updateRefResponse.status
    );
  }

  return {
    sha: newCommitData.sha,
    branch,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Trigger deployment for a single repository
 *
 * @param {string} token - GitHub access token
 * @param {Object} config - Deployment configuration
 * @param {string} config.owner - Repository owner
 * @param {string} config.repo - Repository name
 * @param {string[]} config.branches - Branches to deploy
 * @param {string} config.message - Optional custom commit message
 * @returns {Promise<Object>} Deployment result
 */
async function triggerDeployment(token, config) {
  const { owner, repo, branches, message } = config;
  const results = [];

  for (const branch of branches) {
    try {
      const result = await createEmptyCommit(token, owner, repo, branch, { message });
      results.push({
        branch,
        status: 'success',
        sha: result.sha,
        timestamp: result.timestamp,
      });
    } catch (error) {
      results.push({
        branch,
        status: 'failed',
        error: error.message,
        code: error.code,
      });
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length;
  const failCount = results.filter((r) => r.status === 'failed').length;

  let status = 'success';
  if (failCount === results.length) {
    status = 'failed';
  } else if (failCount > 0) {
    status = 'partial';
  }

  return {
    repo: `${owner}/${repo}`,
    status,
    branches: results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failCount,
    },
  };
}

/**
 * Trigger deployment for multiple repositories (batch operation)
 *
 * @param {string} token - GitHub access token
 * @param {Array} repos - Array of repo configs
 * @param {Object} options - Batch options
 * @param {number} options.concurrency - Max concurrent deployments (default: 3)
 * @returns {Promise<Object>} Batch deployment result
 */
async function triggerBatchDeployment(token, repos, options = {}) {
  const { concurrency = 3 } = options;
  const results = [];

  // Process in batches to respect rate limits
  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((repoConfig) => triggerDeployment(token, repoConfig))
    );
    results.push(...batchResults);
  }

  const successCount = results.filter((r) => r.status === 'success').length;
  const failCount = results.filter((r) => r.status === 'failed').length;
  const partialCount = results.filter((r) => r.status === 'partial').length;

  return {
    results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failCount,
      partial: partialCount,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Deployment Queue for rate-limited processing
 */
class DeploymentQueue {
  constructor(options = {}) {
    this.queue = [];
    this.rateLimit = options.rateLimit || 30; // requests per window
    this.rateLimitWindow = options.rateLimitWindow || 60000; // 1 minute
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  add(task) {
    this.queue.push(task);
  }

  async process() {
    const results = [];

    for (const task of this.queue) {
      // Check rate limit
      const now = Date.now();
      if (now - this.windowStart > this.rateLimitWindow) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      if (this.requestCount >= this.rateLimit) {
        const waitTime = this.rateLimitWindow - (now - this.windowStart);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.windowStart = Date.now();
      }

      try {
        const result = await task();
        results.push({ status: 'success', result });
      } catch (error) {
        results.push({ status: 'error', error: error.message });
      }

      this.requestCount++;
    }

    return results;
  }
}

module.exports = {
  DeploymentError,
  createEmptyCommit,
  triggerDeployment,
  triggerBatchDeployment,
  DeploymentQueue,
  generateCommitMessage,
};
