/**
 * Deployment History
 * Phase 3.2 - Deployment History Tracking
 *
 * Logs and retrieves deployment history for users.
 */

/**
 * Deployment status enum
 */
const DeploymentStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  PARTIAL: 'partial',
};

// In-memory storage (replace with database in production)
const historyStore = new Map();

/**
 * Generate unique ID
 */
function generateId() {
  return `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get history array for user
 */
function getUserHistory(userId) {
  if (!historyStore.has(userId)) {
    historyStore.set(userId, []);
  }
  return historyStore.get(userId);
}

/**
 * Log a deployment event
 * @param {string} userId - User ID
 * @param {Object} data - Deployment data
 * @returns {Object} Created log entry
 */
function logDeployment(userId, data) {
  const history = getUserHistory(userId);

  const entry = {
    id: generateId(),
    userId,
    repo: data.repo,
    branch: data.branch,
    status: data.status,
    sha: data.sha || null,
    commitMessage: data.commitMessage || null,
    errorMessage: data.errorMessage || null,
    triggeredAt: new Date().toISOString(),
    completedAt: data.status !== DeploymentStatus.PENDING ? new Date().toISOString() : null,
  };

  history.push(entry);
  return entry;
}

/**
 * Get deployment history for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.status - Filter by status
 * @param {string} filters.repo - Filter by repository
 * @param {string} filters.fromDate - Filter from date (ISO string)
 * @param {string} filters.toDate - Filter to date (ISO string)
 * @param {number} filters.limit - Limit number of results
 * @returns {Array} Filtered deployment history
 */
function getDeploymentHistory(userId, filters = {}) {
  const history = getUserHistory(userId);

  let filtered = [...history];

  // Filter by status
  if (filters.status) {
    filtered = filtered.filter((h) => h.status === filters.status);
  }

  // Filter by repo
  if (filters.repo) {
    filtered = filtered.filter((h) => h.repo === filters.repo);
  }

  // Filter by date range
  if (filters.fromDate) {
    const fromDate = new Date(filters.fromDate);
    filtered = filtered.filter((h) => new Date(h.triggeredAt) >= fromDate);
  }

  if (filters.toDate) {
    const toDate = new Date(filters.toDate);
    filtered = filtered.filter((h) => new Date(h.triggeredAt) <= toDate);
  }

  // Sort by triggeredAt descending (most recent first)
  filtered.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));

  // Limit results
  if (filters.limit && filters.limit > 0) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Get a specific deployment by ID
 * @param {string} userId - User ID
 * @param {string} deploymentId - Deployment ID
 * @returns {Object|null} Deployment entry or null
 */
function getDeploymentById(userId, deploymentId) {
  const history = getUserHistory(userId);
  return history.find((h) => h.id === deploymentId) || null;
}

/**
 * Get deployment statistics for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters (same as getDeploymentHistory)
 * @returns {Object} Statistics
 */
function getDeploymentStats(userId, filters = {}) {
  const history = getDeploymentHistory(userId, filters);

  const stats = {
    total: history.length,
    success: history.filter((h) => h.status === DeploymentStatus.SUCCESS).length,
    failed: history.filter((h) => h.status === DeploymentStatus.FAILED).length,
    partial: history.filter((h) => h.status === DeploymentStatus.PARTIAL).length,
    repos: [...new Set(history.map((h) => h.repo))],
  };

  stats.successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  return stats;
}

/**
 * Export deployment history to CSV format
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters
 * @returns {string} CSV string
 */
function exportHistoryToCsv(userId, filters = {}) {
  const history = getDeploymentHistory(userId, filters);

  const headers = [
    'ID',
    'Repository',
    'Branch',
    'Status',
    'SHA',
    'Triggered At',
    'Completed At',
    'Error',
  ];
  const rows = history.map((h) => [
    h.id,
    h.repo,
    h.branch,
    h.status,
    h.sha || '',
    h.triggeredAt,
    h.completedAt || '',
    h.errorMessage || '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join(
    '\n'
  );

  return csvContent;
}

/**
 * Clear all history (for testing)
 */
function clearHistory() {
  historyStore.clear();
}

module.exports = {
  DeploymentStatus,
  logDeployment,
  getDeploymentHistory,
  getDeploymentById,
  getDeploymentStats,
  exportHistoryToCsv,
  clearHistory,
};
