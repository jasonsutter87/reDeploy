/**
 * Deployment Groups
 * Phase 4.1 - Deployment Groups/Presets
 *
 * Allows users to create groups of repositories for batch deployments.
 */

/**
 * Custom error class for group operations
 */
class GroupError extends Error {
  constructor(message, code = 'GROUP_ERROR') {
    super(message);
    this.name = 'GroupError';
    this.code = code;
  }
}

// In-memory storage (replace with database in production)
const groupStore = new Map();

/**
 * Generate unique ID
 */
function generateId() {
  return `grp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get groups array for user
 */
function getUserGroups(userId) {
  if (!groupStore.has(userId)) {
    groupStore.set(userId, []);
  }
  return groupStore.get(userId);
}

/**
 * Create a new deployment group
 * @param {string} userId - User ID
 * @param {Object} data - Group data
 * @returns {Object} Created group
 */
function createGroup(userId, data) {
  if (!data.name || data.name.trim() === '') {
    throw new GroupError('Group name is required', 'MISSING_NAME');
  }

  const groups = getUserGroups(userId);

  // Check for duplicate name
  const existing = groups.find(
    (g) => g.name.toLowerCase() === data.name.toLowerCase()
  );
  if (existing) {
    throw new GroupError('Group with this name already exists', 'DUPLICATE_NAME');
  }

  const group = {
    id: generateId(),
    userId,
    name: data.name.trim(),
    description: data.description || '',
    repoIds: data.repoIds || [],
    color: data.color || '#3B82F6', // Default blue
    createdAt: new Date().toISOString(),
  };

  groups.push(group);
  return group;
}

/**
 * Get all groups for a user
 * @param {string} userId - User ID
 * @returns {Array} List of groups
 */
function getGroups(userId) {
  return [...getUserGroups(userId)];
}

/**
 * Get a specific group by ID
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @returns {Object|null} Group or null
 */
function getGroupById(userId, groupId) {
  const groups = getUserGroups(userId);
  return groups.find((g) => g.id === groupId) || null;
}

/**
 * Update a group
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated group
 */
function updateGroup(userId, groupId, updates) {
  const groups = getUserGroups(userId);
  const index = groups.findIndex((g) => g.id === groupId);

  if (index === -1) {
    throw new GroupError('Group not found', 'NOT_FOUND');
  }

  // Check for duplicate name if updating name
  if (updates.name) {
    const existing = groups.find(
      (g) => g.id !== groupId && g.name.toLowerCase() === updates.name.toLowerCase()
    );
    if (existing) {
      throw new GroupError('Group with this name already exists', 'DUPLICATE_NAME');
    }
  }

  const group = groups[index];
  const updated = {
    ...group,
    ...(updates.name && { name: updates.name.trim() }),
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.color && { color: updates.color }),
    ...(updates.repoIds && { repoIds: updates.repoIds }),
    updatedAt: new Date().toISOString(),
  };

  groups[index] = updated;
  return updated;
}

/**
 * Delete a group
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 */
function deleteGroup(userId, groupId) {
  const groups = getUserGroups(userId);
  const index = groups.findIndex((g) => g.id === groupId);

  if (index === -1) {
    throw new GroupError('Group not found', 'NOT_FOUND');
  }

  groups.splice(index, 1);
}

/**
 * Add a repository to a group
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @param {string} repoId - Repository config ID to add
 * @returns {Object} Updated group
 */
function addRepoToGroup(userId, groupId, repoId) {
  const group = getGroupById(userId, groupId);

  if (!group) {
    throw new GroupError('Group not found', 'NOT_FOUND');
  }

  if (!group.repoIds.includes(repoId)) {
    group.repoIds.push(repoId);
    group.updatedAt = new Date().toISOString();
  }

  return group;
}

/**
 * Remove a repository from a group
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @param {string} repoId - Repository config ID to remove
 * @returns {Object} Updated group
 */
function removeRepoFromGroup(userId, groupId, repoId) {
  const group = getGroupById(userId, groupId);

  if (!group) {
    throw new GroupError('Group not found', 'NOT_FOUND');
  }

  group.repoIds = group.repoIds.filter((id) => id !== repoId);
  group.updatedAt = new Date().toISOString();

  return group;
}

/**
 * Clear all groups (for testing)
 */
function clearGroups() {
  groupStore.clear();
}

module.exports = {
  GroupError,
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addRepoToGroup,
  removeRepoFromGroup,
  clearGroups,
};
