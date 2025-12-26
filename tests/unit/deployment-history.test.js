/**
 * Deployment History Tests
 * Phase 3.2 - Deployment History TDD
 */

const {
  logDeployment,
  getDeploymentHistory,
  getDeploymentById,
  clearHistory,
  DeploymentStatus,
} = require('../../netlify/functions/deployment-history');

describe('Deployment History', () => {
  beforeEach(() => {
    clearHistory();
  });

  describe('logDeployment', () => {
    it('should log a successful deployment', () => {
      const log = logDeployment('user123', {
        repo: 'owner/repo',
        branch: 'main',
        status: DeploymentStatus.SUCCESS,
        sha: 'abc123',
      });

      expect(log).toMatchObject({
        id: expect.any(String),
        userId: 'user123',
        repo: 'owner/repo',
        branch: 'main',
        status: DeploymentStatus.SUCCESS,
        sha: 'abc123',
        triggeredAt: expect.any(String),
      });
    });

    it('should log a failed deployment with error message', () => {
      const log = logDeployment('user123', {
        repo: 'owner/repo',
        branch: 'main',
        status: DeploymentStatus.FAILED,
        errorMessage: 'Branch not found',
      });

      expect(log.status).toBe(DeploymentStatus.FAILED);
      expect(log.errorMessage).toBe('Branch not found');
    });

    it('should auto-generate timestamp', () => {
      const before = new Date().toISOString();
      const log = logDeployment('user123', {
        repo: 'owner/repo',
        branch: 'main',
        status: DeploymentStatus.SUCCESS,
      });
      const after = new Date().toISOString();

      expect(log.triggeredAt >= before).toBe(true);
      expect(log.triggeredAt <= after).toBe(true);
    });

    it('should store commit message if provided', () => {
      const log = logDeployment('user123', {
        repo: 'owner/repo',
        branch: 'main',
        status: DeploymentStatus.SUCCESS,
        commitMessage: 'chore: trigger rebuild [2025-01-15]',
      });

      expect(log.commitMessage).toBe('chore: trigger rebuild [2025-01-15]');
    });
  });

  describe('getDeploymentHistory', () => {
    it('should return all deployments for a user', () => {
      logDeployment('user1', { repo: 'owner/repo1', branch: 'main', status: DeploymentStatus.SUCCESS });
      logDeployment('user1', { repo: 'owner/repo2', branch: 'main', status: DeploymentStatus.SUCCESS });
      logDeployment('user2', { repo: 'owner/repo3', branch: 'main', status: DeploymentStatus.SUCCESS });

      const history = getDeploymentHistory('user1');

      expect(history).toHaveLength(2);
      expect(history.every((h) => h.userId === 'user1')).toBe(true);
    });

    it('should return deployments in reverse chronological order', () => {
      const log1 = logDeployment('user1', { repo: 'owner/repo1', branch: 'main', status: DeploymentStatus.SUCCESS });
      const log2 = logDeployment('user1', { repo: 'owner/repo2', branch: 'main', status: DeploymentStatus.SUCCESS });
      const log3 = logDeployment('user1', { repo: 'owner/repo3', branch: 'main', status: DeploymentStatus.SUCCESS });

      // Manually set different timestamps to test ordering
      log1.triggeredAt = '2025-01-15T10:00:00Z';
      log2.triggeredAt = '2025-01-15T11:00:00Z';
      log3.triggeredAt = '2025-01-15T12:00:00Z';

      const history = getDeploymentHistory('user1');

      expect(history[0].repo).toBe('owner/repo3');
      expect(history[2].repo).toBe('owner/repo1');
    });

    it('should filter by status', () => {
      logDeployment('user1', { repo: 'owner/repo1', branch: 'main', status: DeploymentStatus.SUCCESS });
      logDeployment('user1', { repo: 'owner/repo2', branch: 'main', status: DeploymentStatus.FAILED });
      logDeployment('user1', { repo: 'owner/repo3', branch: 'main', status: DeploymentStatus.SUCCESS });

      const successOnly = getDeploymentHistory('user1', { status: DeploymentStatus.SUCCESS });

      expect(successOnly).toHaveLength(2);
      expect(successOnly.every((h) => h.status === DeploymentStatus.SUCCESS)).toBe(true);
    });

    it('should filter by repo', () => {
      logDeployment('user1', { repo: 'owner/repo1', branch: 'main', status: DeploymentStatus.SUCCESS });
      logDeployment('user1', { repo: 'owner/repo2', branch: 'main', status: DeploymentStatus.SUCCESS });
      logDeployment('user1', { repo: 'owner/repo1', branch: 'develop', status: DeploymentStatus.SUCCESS });

      const repo1Only = getDeploymentHistory('user1', { repo: 'owner/repo1' });

      expect(repo1Only).toHaveLength(2);
      expect(repo1Only.every((h) => h.repo === 'owner/repo1')).toBe(true);
    });

    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Manually set timestamps for testing
      const log1 = logDeployment('user1', { repo: 'owner/repo1', branch: 'main', status: DeploymentStatus.SUCCESS });
      log1.triggeredAt = twoDaysAgo.toISOString();

      const log2 = logDeployment('user1', { repo: 'owner/repo2', branch: 'main', status: DeploymentStatus.SUCCESS });
      log2.triggeredAt = yesterday.toISOString();

      const log3 = logDeployment('user1', { repo: 'owner/repo3', branch: 'main', status: DeploymentStatus.SUCCESS });
      log3.triggeredAt = now.toISOString();

      const last24Hours = getDeploymentHistory('user1', {
        fromDate: yesterday.toISOString(),
      });

      expect(last24Hours.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit results', () => {
      for (let i = 0; i < 10; i++) {
        logDeployment('user1', { repo: `owner/repo${i}`, branch: 'main', status: DeploymentStatus.SUCCESS });
      }

      const limited = getDeploymentHistory('user1', { limit: 5 });

      expect(limited).toHaveLength(5);
    });

    it('should return empty array for user with no history', () => {
      const history = getDeploymentHistory('nonexistent');
      expect(history).toEqual([]);
    });
  });

  describe('getDeploymentById', () => {
    it('should return specific deployment by ID', () => {
      const log = logDeployment('user1', { repo: 'owner/repo', branch: 'main', status: DeploymentStatus.SUCCESS });

      const retrieved = getDeploymentById('user1', log.id);

      expect(retrieved).toEqual(log);
    });

    it('should return null for non-existent ID', () => {
      const retrieved = getDeploymentById('user1', 'nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should not return deployment from different user', () => {
      const log = logDeployment('user1', { repo: 'owner/repo', branch: 'main', status: DeploymentStatus.SUCCESS });

      const retrieved = getDeploymentById('user2', log.id);

      expect(retrieved).toBeNull();
    });
  });

  describe('DeploymentStatus enum', () => {
    it('should have correct status values', () => {
      expect(DeploymentStatus.PENDING).toBe('pending');
      expect(DeploymentStatus.SUCCESS).toBe('success');
      expect(DeploymentStatus.FAILED).toBe('failed');
      expect(DeploymentStatus.PARTIAL).toBe('partial');
    });
  });
});
