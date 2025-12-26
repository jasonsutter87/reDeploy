/**
 * Deployment Groups Tests
 * Phase 4.1 - Deployment Groups/Presets TDD
 */

const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addRepoToGroup,
  removeRepoFromGroup,
  clearGroups,
  GroupError,
} = require('../../netlify/functions/deployment-groups');

describe('Deployment Groups', () => {
  beforeEach(() => {
    clearGroups();
  });

  describe('createGroup', () => {
    it('should create a new deployment group', () => {
      const group = createGroup('user1', {
        name: 'Production Sites',
        description: 'All production websites',
        repoIds: ['cfg_1', 'cfg_2'],
      });

      expect(group).toMatchObject({
        id: expect.any(String),
        userId: 'user1',
        name: 'Production Sites',
        description: 'All production websites',
        repoIds: ['cfg_1', 'cfg_2'],
        createdAt: expect.any(String),
      });
    });

    it('should require a name', () => {
      expect(() => createGroup('user1', { description: 'Test' })).toThrow(GroupError);
      expect(() => createGroup('user1', { description: 'Test' })).toThrow('Group name is required');
    });

    it('should allow empty repoIds initially', () => {
      const group = createGroup('user1', { name: 'Empty Group' });
      expect(group.repoIds).toEqual([]);
    });

    it('should prevent duplicate group names for same user', () => {
      createGroup('user1', { name: 'Production' });

      expect(() => createGroup('user1', { name: 'Production' })).toThrow(
        'Group with this name already exists'
      );
    });

    it('should allow same group name for different users', () => {
      createGroup('user1', { name: 'Production' });
      const group2 = createGroup('user2', { name: 'Production' });

      expect(group2).toBeDefined();
    });
  });

  describe('getGroups', () => {
    it('should return all groups for a user', () => {
      createGroup('user1', { name: 'Group 1' });
      createGroup('user1', { name: 'Group 2' });
      createGroup('user2', { name: 'Group 3' });

      const groups = getGroups('user1');

      expect(groups).toHaveLength(2);
      expect(groups.every((g) => g.userId === 'user1')).toBe(true);
    });

    it('should return empty array for user with no groups', () => {
      const groups = getGroups('nonexistent');
      expect(groups).toEqual([]);
    });
  });

  describe('getGroupById', () => {
    it('should return specific group by ID', () => {
      const created = createGroup('user1', { name: 'My Group' });
      const retrieved = getGroupById('user1', created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent ID', () => {
      const result = getGroupById('user1', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should not return group from different user', () => {
      const created = createGroup('user1', { name: 'My Group' });
      const result = getGroupById('user2', created.id);

      expect(result).toBeNull();
    });
  });

  describe('updateGroup', () => {
    it('should update group name', () => {
      const created = createGroup('user1', { name: 'Old Name' });
      const updated = updateGroup('user1', created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.updatedAt).toBeDefined();
    });

    it('should update group description', () => {
      const created = createGroup('user1', { name: 'Group', description: 'Old desc' });
      const updated = updateGroup('user1', created.id, { description: 'New desc' });

      expect(updated.description).toBe('New desc');
    });

    it('should throw error for non-existent group', () => {
      expect(() => updateGroup('user1', 'nonexistent', { name: 'New' })).toThrow('Group not found');
    });

    it('should prevent duplicate names when updating', () => {
      createGroup('user1', { name: 'Existing' });
      const created = createGroup('user1', { name: 'Other' });

      expect(() => updateGroup('user1', created.id, { name: 'Existing' })).toThrow(
        'Group with this name already exists'
      );
    });
  });

  describe('deleteGroup', () => {
    it('should delete existing group', () => {
      const created = createGroup('user1', { name: 'To Delete' });
      deleteGroup('user1', created.id);

      const groups = getGroups('user1');
      expect(groups).toHaveLength(0);
    });

    it('should throw error for non-existent group', () => {
      expect(() => deleteGroup('user1', 'nonexistent')).toThrow('Group not found');
    });
  });

  describe('addRepoToGroup', () => {
    it('should add repo to group', () => {
      const created = createGroup('user1', { name: 'Group', repoIds: ['cfg_1'] });
      const updated = addRepoToGroup('user1', created.id, 'cfg_2');

      expect(updated.repoIds).toContain('cfg_1');
      expect(updated.repoIds).toContain('cfg_2');
    });

    it('should not add duplicate repo', () => {
      const created = createGroup('user1', { name: 'Group', repoIds: ['cfg_1'] });
      const updated = addRepoToGroup('user1', created.id, 'cfg_1');

      expect(updated.repoIds).toHaveLength(1);
    });

    it('should throw error for non-existent group', () => {
      expect(() => addRepoToGroup('user1', 'nonexistent', 'cfg_1')).toThrow('Group not found');
    });
  });

  describe('removeRepoFromGroup', () => {
    it('should remove repo from group', () => {
      const created = createGroup('user1', { name: 'Group', repoIds: ['cfg_1', 'cfg_2'] });
      const updated = removeRepoFromGroup('user1', created.id, 'cfg_1');

      expect(updated.repoIds).not.toContain('cfg_1');
      expect(updated.repoIds).toContain('cfg_2');
    });

    it('should handle removing non-existent repo gracefully', () => {
      const created = createGroup('user1', { name: 'Group', repoIds: ['cfg_1'] });
      const updated = removeRepoFromGroup('user1', created.id, 'cfg_999');

      expect(updated.repoIds).toEqual(['cfg_1']);
    });
  });
});
