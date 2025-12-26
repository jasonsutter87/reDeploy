/**
 * Deployment Trigger Tests
 * Phase 2.3 - Deployment Trigger TDD
 */

global.fetch = jest.fn();

const {
  createEmptyCommit,
  triggerDeployment,
  triggerBatchDeployment,
  DeploymentError,
  DeploymentQueue,
} = require('../../netlify/functions/deployment-trigger');

describe('Deployment Trigger', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T10:30:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createEmptyCommit', () => {
    it('should create an empty commit with default message', async () => {
      // Mock getting the latest commit SHA
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'abc123' } }),
      });
      // Mock creating the tree (same as parent)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sha: 'abc123', tree: { sha: 'tree123' } }),
      });
      // Mock creating the commit
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sha: 'newcommit123' }),
      });
      // Mock updating the ref
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ object: { sha: 'newcommit123' } }),
      });

      const result = await createEmptyCommit('token', 'owner', 'repo', 'main');

      expect(result).toMatchObject({
        sha: 'newcommit123',
        branch: 'main',
        message: expect.stringContaining('chore: trigger rebuild'),
      });
    });

    it('should include timestamp in commit message', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'abc123' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: 'abc123', tree: { sha: 'tree123' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: 'newcommit123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'newcommit123' } }),
        });

      const result = await createEmptyCommit('token', 'owner', 'repo', 'main');

      expect(result.message).toContain('2025-01-15');
      expect(result.message).toContain('10:30:00');
    });

    it('should use custom commit message when provided', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'abc123' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: 'abc123', tree: { sha: 'tree123' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: 'newcommit123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'newcommit123' } }),
        });

      const result = await createEmptyCommit('token', 'owner', 'repo', 'main', {
        message: 'Custom deploy message',
      });

      expect(result.message).toBe('Custom deploy message');
    });

    it('should throw DeploymentError on API failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Repository not found' }),
      });

      await expect(createEmptyCommit('token', 'owner', 'nonexistent', 'main')).rejects.toThrow(
        DeploymentError
      );
    });

    it('should throw DeploymentError on branch not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Branch not found' }),
      });

      await expect(createEmptyCommit('token', 'owner', 'repo', 'nonexistent')).rejects.toThrow(
        DeploymentError
      );
    });
  });

  describe('triggerDeployment', () => {
    const mockSuccessfulCommit = () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'abc123' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: 'abc123', tree: { sha: 'tree123' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sha: 'newcommit123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ object: { sha: 'newcommit123' } }),
        });
    };

    it('should trigger deployment for single branch', async () => {
      mockSuccessfulCommit();

      const result = await triggerDeployment('token', {
        owner: 'owner',
        repo: 'repo',
        branches: ['main'],
      });

      expect(result).toMatchObject({
        repo: 'owner/repo',
        status: 'success',
        branches: [{ branch: 'main', status: 'success', sha: 'newcommit123' }],
      });
    });

    it('should trigger deployment for multiple branches', async () => {
      // Mock for main branch
      mockSuccessfulCommit();
      // Mock for develop branch
      mockSuccessfulCommit();

      const result = await triggerDeployment('token', {
        owner: 'owner',
        repo: 'repo',
        branches: ['main', 'develop'],
      });

      expect(result.branches).toHaveLength(2);
      expect(result.branches[0].branch).toBe('main');
      expect(result.branches[1].branch).toBe('develop');
    });

    it('should handle partial failures gracefully', async () => {
      // Success for main
      mockSuccessfulCommit();
      // Failure for develop
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Branch not found' }),
      });

      const result = await triggerDeployment('token', {
        owner: 'owner',
        repo: 'repo',
        branches: ['main', 'develop'],
      });

      expect(result.status).toBe('partial');
      expect(result.branches[0].status).toBe('success');
      expect(result.branches[1].status).toBe('failed');
      expect(result.branches[1].error).toContain('Branch not found');
    });

    it('should return failed status when all branches fail', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
      });

      const result = await triggerDeployment('token', {
        owner: 'owner',
        repo: 'repo',
        branches: ['main'],
      });

      expect(result.status).toBe('failed');
    });
  });

  describe('triggerBatchDeployment', () => {
    it('should deploy to multiple repositories', async () => {
      // Use mockImplementation for consistent behavior with parallel processing
      fetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ object: { sha: 'abc123' }, sha: 'abc123', tree: { sha: 'tree123' } }),
      }));

      const repos = [
        { owner: 'owner', repo: 'repo1', branches: ['main'] },
        { owner: 'owner', repo: 'repo2', branches: ['main'] },
      ];

      const result = await triggerBatchDeployment('token', repos);

      expect(result.results).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it('should handle mixed success/failure in batch', async () => {
      // Track which repo is being accessed
      let callCount = 0;
      fetch.mockImplementation(async (_url) => {
        callCount++;
        // First 4 calls are for repo1 (success), next calls are for repo2 (fail)
        if (callCount <= 4) {
          return {
            ok: true,
            json: async () => ({ object: { sha: 'abc1' }, sha: 'abc1', tree: { sha: 'tree1' } }),
          };
        }
        return { ok: false, status: 404, json: async () => ({ message: 'Not found' }) };
      });

      const repos = [
        { owner: 'owner', repo: 'repo1', branches: ['main'] },
        { owner: 'owner', repo: 'repo2', branches: ['main'] },
      ];

      // Process sequentially (concurrency 1) to ensure order
      const result = await triggerBatchDeployment('token', repos, { concurrency: 1 });

      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
    });

    it('should process repositories in batches', async () => {
      // Just verify it completes without error with multiple repos
      fetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ object: { sha: 'abc' }, sha: 'abc', tree: { sha: 'tree' } }),
      }));

      const repos = [
        { owner: 'owner', repo: 'repo1', branches: ['main'] },
        { owner: 'owner', repo: 'repo2', branches: ['main'] },
        { owner: 'owner', repo: 'repo3', branches: ['main'] },
      ];

      const result = await triggerBatchDeployment('token', repos, { concurrency: 2 });

      expect(result.results).toHaveLength(3);
    });
  });

  describe('DeploymentQueue', () => {
    it('should process items in order', async () => {
      const queue = new DeploymentQueue();
      const results = [];

      queue.add(async () => {
        results.push(1);
        return 1;
      });
      queue.add(async () => {
        results.push(2);
        return 2;
      });
      queue.add(async () => {
        results.push(3);
        return 3;
      });

      await queue.process();

      expect(results).toEqual([1, 2, 3]);
    });

    it('should track request count', async () => {
      const queue = new DeploymentQueue({ rateLimit: 10, rateLimitWindow: 60000 });

      queue.add(async () => 1);
      queue.add(async () => 2);
      queue.add(async () => 3);

      const results = await queue.process();

      expect(results).toHaveLength(3);
      expect(results[0].result).toBe(1);
      expect(results[1].result).toBe(2);
      expect(results[2].result).toBe(3);
    });

    it('should handle errors without stopping queue', async () => {
      const queue = new DeploymentQueue();
      const results = [];

      queue.add(async () => {
        results.push(1);
        return 1;
      });
      queue.add(async () => {
        throw new Error('Test error');
      });
      queue.add(async () => {
        results.push(3);
        return 3;
      });

      const queueResults = await queue.process();

      expect(results).toEqual([1, 3]);
      expect(queueResults[1].error).toBeDefined();
    });
  });

  describe('DeploymentError', () => {
    it('should create error with message and code', () => {
      const error = new DeploymentError('Deployment failed', 'DEPLOY_FAILED', 500);
      expect(error.message).toBe('Deployment failed');
      expect(error.code).toBe('DEPLOY_FAILED');
      expect(error.status).toBe(500);
      expect(error.name).toBe('DeploymentError');
    });
  });
});
