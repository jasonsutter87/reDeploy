/**
 * Webhook Endpoint
 * Phase 4.2 - Incoming Webhooks
 *
 * Allows external services to trigger deployments via webhook.
 * Each user can generate unique webhook URLs with secret tokens.
 */

const crypto = require('crypto');
const { triggerBatchDeployment } = require('./deployment-trigger');
const { getRepoConfigs } = require('./repo-management');
const { getGroupById, getGroups } = require('./deployment-groups');
const { logDeployment, DeploymentStatus } = require('./deployment-history');

// In-memory webhook storage (replace with database in production)
const webhookStore = new Map();

/**
 * Generate a secure webhook token
 */
function generateWebhookToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate webhook ID
 */
function generateWebhookId() {
  return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get webhooks for a user
 */
function getUserWebhooks(userId) {
  if (!webhookStore.has(userId)) {
    webhookStore.set(userId, []);
  }
  return webhookStore.get(userId);
}

/**
 * Create a new webhook
 */
function createWebhook(userId, data) {
  const webhooks = getUserWebhooks(userId);

  const webhook = {
    id: generateWebhookId(),
    userId,
    name: data.name || 'Unnamed Webhook',
    token: generateWebhookToken(),
    targetType: data.targetType || 'all', // 'all', 'group', 'repos'
    targetId: data.targetId || null, // group ID if targetType is 'group'
    repoIds: data.repoIds || [], // repo IDs if targetType is 'repos'
    isActive: true,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    usageCount: 0,
  };

  webhooks.push(webhook);
  return webhook;
}

/**
 * Get webhook by token (for validation)
 */
function getWebhookByToken(token) {
  for (const [_userId, webhooks] of webhookStore.entries()) {
    const webhook = webhooks.find((w) => w.token === token && w.isActive);
    if (webhook) {
      return webhook;
    }
  }
  return null;
}

/**
 * Update webhook usage stats
 */
function recordWebhookUsage(webhook) {
  webhook.lastUsedAt = new Date().toISOString();
  webhook.usageCount++;
}

/**
 * Log deployment results to history
 */
function logDeploymentResults(userId, results) {
  for (const result of results) {
    for (const branch of result.branches) {
      logDeployment(userId, {
        repo: result.repo,
        branch: branch.branch,
        status: branch.status === 'success' ? DeploymentStatus.SUCCESS : DeploymentStatus.FAILED,
        sha: branch.sha || null,
        errorMessage: branch.error || null,
      });
    }
  }
}

/**
 * Main handler for /api/webhook endpoint
 */
exports.handler = async (event, _context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-User-Id, X-Webhook-Token',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  const pathParts = event.path.split('/').filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];

  // Webhook trigger: POST /api/webhook/trigger
  if (event.httpMethod === 'POST' && lastPart === 'trigger') {
    const token =
      event.headers['x-webhook-token'] ||
      event.queryStringParameters?.token;

    if (!token) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Webhook token required' }),
      };
    }

    const webhook = getWebhookByToken(token);
    if (!webhook) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid or inactive webhook' }),
      };
    }

    // Get GitHub token from user (would be stored in database)
    // For now, require it in headers for webhook triggers
    const githubToken = event.headers['x-github-token'];
    if (!githubToken) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'GitHub token required for deployment' }),
      };
    }

    try {
      let repoList = [];

      // Determine which repos to deploy based on webhook config
      if (webhook.targetType === 'all') {
        const configs = await getRepoConfigs(webhook.userId, { isActive: true });
        repoList = configs.map((c) => {
          const [owner, repo] = c.fullName.split('/');
          return { owner, repo, branches: c.selectedBranches };
        });
      } else if (webhook.targetType === 'group') {
        const group = getGroupById(webhook.userId, webhook.targetId);
        if (group) {
          const allConfigs = await getRepoConfigs(webhook.userId);
          const groupConfigs = allConfigs.filter((c) => group.repoIds.includes(c.id));
          repoList = groupConfigs.map((c) => {
            const [owner, repo] = c.fullName.split('/');
            return { owner, repo, branches: c.selectedBranches };
          });
        }
      } else if (webhook.targetType === 'repos') {
        const allConfigs = await getRepoConfigs(webhook.userId);
        const selectedConfigs = allConfigs.filter((c) => webhook.repoIds.includes(c.id));
        repoList = selectedConfigs.map((c) => {
          const [owner, repo] = c.fullName.split('/');
          return { owner, repo, branches: c.selectedBranches };
        });
      }

      if (repoList.length === 0) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'No repositories to deploy' }),
        };
      }

      const result = await triggerBatchDeployment(githubToken, repoList);

      // Record usage and log to history
      recordWebhookUsage(webhook);
      logDeploymentResults(webhook.userId, result.results);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Deployment triggered',
          webhook: webhook.name,
          ...result,
        }),
      };
    } catch (error) {
      console.error('Webhook trigger error:', error);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Deployment failed', message: error.message }),
      };
    }
  }

  // Management endpoints require user authentication
  const userId = event.headers['x-user-id'];
  if (!userId) {
    return {
      statusCode: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'User identification required' }),
    };
  }

  // GET - List webhooks
  if (event.httpMethod === 'GET') {
    const webhooks = getUserWebhooks(userId).map((w) => ({
      ...w,
      token: w.token.substring(0, 8) + '...' + w.token.substring(w.token.length - 8), // Mask token
    }));

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhooks, total: webhooks.length }),
    };
  }

  // POST - Create webhook
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

    const webhook = createWebhook(userId, body);

    return {
      statusCode: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...webhook,
        webhookUrl: `/.netlify/functions/webhook/trigger?token=${webhook.token}`,
      }),
    };
  }

  // DELETE - Delete webhook
  if (event.httpMethod === 'DELETE') {
    const webhookId = lastPart;
    const webhooks = getUserWebhooks(userId);
    const index = webhooks.findIndex((w) => w.id === webhookId);

    if (index === -1) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Webhook not found' }),
      };
    }

    webhooks.splice(index, 1);

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
};

// Export for testing
module.exports.createWebhook = createWebhook;
module.exports.getWebhookByToken = getWebhookByToken;
module.exports.getUserWebhooks = getUserWebhooks;
