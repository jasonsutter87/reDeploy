/**
 * Repository Management Tests
 * Phase 2.2 - Repository Selection & Management TDD
 */

global.fetch = jest.fn();

const {
  saveRepoConfig,
  getRepoConfigs,
  updateRepoConfig,
  deleteRepoConfig,
  validateRepoConfig,
  RepoConfigError,
  clearAllConfigs,
} = require('../../netlify/functions/repo-management');

describe('Repository Management', () => {
  beforeEach(() => {
    fetch.mockClear();
    clearAllConfigs();
  });

  describe('validateRepoConfig', () => {
    it('should validate a valid repo config', () => {
      const config = {
        repoId: 12345,
        fullName: 'owner/repo',
        selectedBranches: ['main'],
        isActive: true,
      };

      expect(() => validateRepoConfig(config)).not.toThrow();
    });

    it('should reject config without repoId', () => {
      const config = {
        fullName: 'owner/repo',
        selectedBranches: ['main'],
      };

      expect(() => validateRepoConfig(config)).toThrow(RepoConfigError);
      expect(() => validateRepoConfig(config)).toThrow('repoId is required');
    });

    it('should reject config without fullName', () => {
      const config = {
        repoId: 12345,
        selectedBranches: ['main'],
      };

      expect(() => validateRepoConfig(config)).toThrow('fullName is required');
    });

    it('should reject config without selectedBranches', () => {
      const config = {
        repoId: 12345,
        fullName: 'owner/repo',
      };

      expect(() => validateRepoConfig(config)).toThrow(
        'selectedBranches must be a non-empty array'
      );
    });

    it('should reject config with empty selectedBranches', () => {
      const config = {
        repoId: 12345,
        fullName: 'owner/repo',
        selectedBranches: [],
      };

      expect(() => validateRepoConfig(config)).toThrow(
        'selectedBranches must be a non-empty array'
      );
    });

    it('should accept config with multiple branches', () => {
      const config = {
        repoId: 12345,
        fullName: 'owner/repo',
        selectedBranches: ['main', 'develop', 'staging'],
        isActive: true,
      };

      expect(() => validateRepoConfig(config)).not.toThrow();
    });
  });

  describe('saveRepoConfig', () => {
    it('should save a valid repo configuration', async () => {
      const config = {
        repoId: 12345,
        fullName: 'owner/repo',
        selectedBranches: ['main'],
        isActive: true,
      };

      const result = await saveRepoConfig('user123', config);

      expect(result).toMatchObject({
        id: expect.any(String),
        userId: 'user123',
        repoId: 12345,
        fullName: 'owner/repo',
        selectedBranches: ['main'],
        isActive: true,
        createdAt: expect.any(String),
      });
    });

    it('should throw error for invalid config', async () => {
      const invalidConfig = { fullName: 'owner/repo' };

      await expect(saveRepoConfig('user123', invalidConfig)).rejects.toThrow(RepoConfigError);
    });

    it('should prevent duplicate repo for same user', async () => {
      const config = {
        repoId: 12345,
        fullName: 'owner/repo',
        selectedBranches: ['main'],
      };

      await saveRepoConfig('user123', config);

      await expect(saveRepoConfig('user123', config)).rejects.toThrow(
        'Repository already configured'
      );
    });
  });

  describe('getRepoConfigs', () => {
    it('should return all configs for a user', async () => {
      const config1 = {
        repoId: 1,
        fullName: 'owner/repo1',
        selectedBranches: ['main'],
      };
      const config2 = {
        repoId: 2,
        fullName: 'owner/repo2',
        selectedBranches: ['develop'],
      };

      await saveRepoConfig('user456', config1);
      await saveRepoConfig('user456', config2);

      const configs = await getRepoConfigs('user456');

      expect(configs).toHaveLength(2);
      expect(configs[0].fullName).toBe('owner/repo1');
      expect(configs[1].fullName).toBe('owner/repo2');
    });

    it('should return empty array for user with no configs', async () => {
      const configs = await getRepoConfigs('nonexistent');
      expect(configs).toEqual([]);
    });

    it('should filter by isActive when specified', async () => {
      const config1 = {
        repoId: 10,
        fullName: 'owner/active',
        selectedBranches: ['main'],
        isActive: true,
      };
      const config2 = {
        repoId: 11,
        fullName: 'owner/inactive',
        selectedBranches: ['main'],
        isActive: false,
      };

      await saveRepoConfig('user789', config1);
      await saveRepoConfig('user789', config2);

      const activeConfigs = await getRepoConfigs('user789', { isActive: true });

      expect(activeConfigs).toHaveLength(1);
      expect(activeConfigs[0].fullName).toBe('owner/active');
    });
  });

  describe('updateRepoConfig', () => {
    it('should update existing config', async () => {
      const config = {
        repoId: 100,
        fullName: 'owner/updateme',
        selectedBranches: ['main'],
        isActive: true,
      };

      const saved = await saveRepoConfig('userUpdate', config);

      const updated = await updateRepoConfig('userUpdate', saved.id, {
        selectedBranches: ['main', 'develop'],
        isActive: false,
      });

      expect(updated.selectedBranches).toEqual(['main', 'develop']);
      expect(updated.isActive).toBe(false);
      expect(updated.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent config', async () => {
      await expect(updateRepoConfig('user', 'nonexistent-id', { isActive: false })).rejects.toThrow(
        'Configuration not found'
      );
    });

    it('should not allow updating repoId', async () => {
      const config = {
        repoId: 200,
        fullName: 'owner/noupdate',
        selectedBranches: ['main'],
      };

      const saved = await saveRepoConfig('userNoUpdate', config);

      await expect(updateRepoConfig('userNoUpdate', saved.id, { repoId: 999 })).rejects.toThrow(
        'Cannot modify repoId'
      );
    });
  });

  describe('deleteRepoConfig', () => {
    it('should delete existing config', async () => {
      const config = {
        repoId: 300,
        fullName: 'owner/deleteme',
        selectedBranches: ['main'],
      };

      const saved = await saveRepoConfig('userDelete', config);
      await deleteRepoConfig('userDelete', saved.id);

      const configs = await getRepoConfigs('userDelete');
      expect(configs).toHaveLength(0);
    });

    it('should throw error for non-existent config', async () => {
      await expect(deleteRepoConfig('user', 'nonexistent-id')).rejects.toThrow(
        'Configuration not found'
      );
    });

    it('should only delete config belonging to user', async () => {
      const config = {
        repoId: 400,
        fullName: 'owner/protected',
        selectedBranches: ['main'],
      };

      const saved = await saveRepoConfig('ownerUser', config);

      await expect(deleteRepoConfig('otherUser', saved.id)).rejects.toThrow(
        'Configuration not found'
      );
    });
  });
});
