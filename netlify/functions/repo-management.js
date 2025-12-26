/**
 * Repository Management
 * Phase 2.2 - Repository Configuration Logic
 *
 * Handles saving, retrieving, updating, and deleting repository configurations.
 * Uses in-memory storage for now (will be replaced with database in production).
 */

/**
 * Custom error class for repo configuration errors
 */
class RepoConfigError extends Error {
  constructor(message, code = 'CONFIG_ERROR') {
    super(message);
    this.name = 'RepoConfigError';
    this.code = code;
  }
}

// In-memory storage (replace with database in production)
const configStore = new Map();

/**
 * Generate a unique ID
 */
function generateId() {
  return `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate a repository configuration object
 * @param {Object} config - Configuration to validate
 * @throws {RepoConfigError} If validation fails
 */
function validateRepoConfig(config) {
  if (!config.repoId) {
    throw new RepoConfigError('repoId is required', 'MISSING_REPO_ID');
  }

  if (!config.fullName) {
    throw new RepoConfigError('fullName is required', 'MISSING_FULL_NAME');
  }

  if (
    !config.selectedBranches ||
    !Array.isArray(config.selectedBranches) ||
    config.selectedBranches.length === 0
  ) {
    throw new RepoConfigError('selectedBranches must be a non-empty array', 'INVALID_BRANCHES');
  }
}

/**
 * Get storage key for user configs
 */
function getUserKey(userId) {
  return `user:${userId}:configs`;
}

/**
 * Get all configs for a user from store
 */
function getUserConfigs(userId) {
  const key = getUserKey(userId);
  return configStore.get(key) || [];
}

/**
 * Save configs for a user to store
 */
function setUserConfigs(userId, configs) {
  const key = getUserKey(userId);
  configStore.set(key, configs);
}

/**
 * Save a new repository configuration
 * @param {string} userId - User ID
 * @param {Object} config - Repository configuration
 * @returns {Promise<Object>} Saved configuration with ID
 */
async function saveRepoConfig(userId, config) {
  validateRepoConfig(config);

  const existingConfigs = getUserConfigs(userId);

  // Check for duplicate
  const duplicate = existingConfigs.find((c) => c.repoId === config.repoId);
  if (duplicate) {
    throw new RepoConfigError('Repository already configured', 'DUPLICATE_REPO');
  }

  const newConfig = {
    id: generateId(),
    userId,
    repoId: config.repoId,
    fullName: config.fullName,
    selectedBranches: config.selectedBranches,
    isActive: config.isActive !== undefined ? config.isActive : true,
    createdAt: new Date().toISOString(),
  };

  existingConfigs.push(newConfig);
  setUserConfigs(userId, existingConfigs);

  return newConfig;
}

/**
 * Get all repository configurations for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters
 * @param {boolean} filters.isActive - Filter by active status
 * @returns {Promise<Array>} List of configurations
 */
async function getRepoConfigs(userId, filters = {}) {
  let configs = getUserConfigs(userId);

  if (filters.isActive !== undefined) {
    configs = configs.filter((c) => c.isActive === filters.isActive);
  }

  return configs;
}

/**
 * Update an existing repository configuration
 * @param {string} userId - User ID
 * @param {string} configId - Configuration ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated configuration
 */
async function updateRepoConfig(userId, configId, updates) {
  const configs = getUserConfigs(userId);
  const index = configs.findIndex((c) => c.id === configId);

  if (index === -1) {
    throw new RepoConfigError('Configuration not found', 'NOT_FOUND');
  }

  // Prevent updating immutable fields
  if (updates.repoId !== undefined) {
    throw new RepoConfigError('Cannot modify repoId', 'IMMUTABLE_FIELD');
  }

  if (updates.fullName !== undefined) {
    throw new RepoConfigError('Cannot modify fullName', 'IMMUTABLE_FIELD');
  }

  // Validate branches if updating
  if (updates.selectedBranches !== undefined) {
    if (!Array.isArray(updates.selectedBranches) || updates.selectedBranches.length === 0) {
      throw new RepoConfigError('selectedBranches must be a non-empty array', 'INVALID_BRANCHES');
    }
  }

  const updatedConfig = {
    ...configs[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  configs[index] = updatedConfig;
  setUserConfigs(userId, configs);

  return updatedConfig;
}

/**
 * Delete a repository configuration
 * @param {string} userId - User ID
 * @param {string} configId - Configuration ID
 * @returns {Promise<void>}
 */
async function deleteRepoConfig(userId, configId) {
  const configs = getUserConfigs(userId);
  const index = configs.findIndex((c) => c.id === configId);

  if (index === -1) {
    throw new RepoConfigError('Configuration not found', 'NOT_FOUND');
  }

  configs.splice(index, 1);
  setUserConfigs(userId, configs);
}

/**
 * Clear all configs (for testing)
 */
function clearAllConfigs() {
  configStore.clear();
}

module.exports = {
  RepoConfigError,
  validateRepoConfig,
  saveRepoConfig,
  getRepoConfigs,
  updateRepoConfig,
  deleteRepoConfig,
  clearAllConfigs,
};
