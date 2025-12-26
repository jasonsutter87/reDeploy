/**
 * API Integration Tests
 * Phase 5.1 - Testing & QA
 *
 * Tests the complete flow of API endpoints working together.
 */

// Mock fetch globally
global.fetch = jest.fn();

// reposHandler not used directly - only via saved-repos
// const { handler: reposHandler } = require('../../netlify/functions/repos');
const { handler: savedReposHandler } = require('../../netlify/functions/saved-repos');
const { handler: deployHandler } = require('../../netlify/functions/deploy');
const { handler: historyHandler } = require('../../netlify/functions/history');
const { handler: groupsHandler } = require('../../netlify/functions/groups');

const { clearAllConfigs } = require('../../netlify/functions/repo-management');
const { clearHistory } = require('../../netlify/functions/deployment-history');
const { clearGroups } = require('../../netlify/functions/deployment-groups');

describe('API Integration Flow', () => {
  const userId = 'test-user-123';
  const githubToken = 'test-github-token';

  beforeEach(() => {
    fetch.mockClear();
    clearAllConfigs();
    clearHistory();
    clearGroups();
  });

  describe('Repository Management Flow', () => {
    it('should add and retrieve a repository', async () => {
      // Add a repository
      const addEvent = {
        httpMethod: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({
          repoId: 12345,
          fullName: 'owner/test-repo',
          selectedBranches: ['main'],
        }),
      };

      const addResponse = await savedReposHandler(addEvent);
      expect(addResponse.statusCode).toBe(201);

      const addedRepo = JSON.parse(addResponse.body);
      expect(addedRepo.fullName).toBe('owner/test-repo');

      // Retrieve repositories
      const getEvent = {
        httpMethod: 'GET',
        headers: { 'x-user-id': userId },
        queryStringParameters: {},
      };

      const getResponse = await savedReposHandler(getEvent);
      expect(getResponse.statusCode).toBe(200);

      const { configs } = JSON.parse(getResponse.body);
      expect(configs).toHaveLength(1);
      expect(configs[0].fullName).toBe('owner/test-repo');
    });

    it('should prevent duplicate repository addition', async () => {
      const event = {
        httpMethod: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({
          repoId: 12345,
          fullName: 'owner/test-repo',
          selectedBranches: ['main'],
        }),
      };

      // First add succeeds
      const firstResponse = await savedReposHandler(event);
      expect(firstResponse.statusCode).toBe(201);

      // Second add fails
      const secondResponse = await savedReposHandler(event);
      expect(secondResponse.statusCode).toBe(409);
    });
  });

  describe('Deployment Flow', () => {
    it('should deploy and log to history', async () => {
      // First add a repo
      const addEvent = {
        httpMethod: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({
          repoId: 12345,
          fullName: 'owner/test-repo',
          selectedBranches: ['main'],
        }),
      };
      await savedReposHandler(addEvent);

      // Mock GitHub API calls for deployment
      fetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ object: { sha: 'abc123' }, sha: 'abc123', tree: { sha: 'tree123' } }),
      }));

      // Trigger deployment
      const deployEvent = {
        httpMethod: 'POST',
        headers: {
          'x-user-id': userId,
          authorization: `Bearer ${githubToken}`,
        },
        body: JSON.stringify({ action: 'deploy-all' }),
      };

      const deployResponse = await deployHandler(deployEvent);
      expect(deployResponse.statusCode).toBe(200);

      const deployResult = JSON.parse(deployResponse.body);
      expect(deployResult.summary.total).toBe(1);

      // Check history was logged
      const historyEvent = {
        httpMethod: 'GET',
        headers: { 'x-user-id': userId },
        path: '/api/history',
        queryStringParameters: {},
      };

      const historyResponse = await historyHandler(historyEvent);
      expect(historyResponse.statusCode).toBe(200);

      const { history } = JSON.parse(historyResponse.body);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].repo).toBe('owner/test-repo');
    });
  });

  describe('Groups Flow', () => {
    it('should create group, add repos, and deploy group', async () => {
      // Add repositories first
      const repo1Event = {
        httpMethod: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({
          repoId: 1,
          fullName: 'owner/repo1',
          selectedBranches: ['main'],
        }),
      };
      const repo1Response = await savedReposHandler(repo1Event);
      const repo1 = JSON.parse(repo1Response.body);

      const repo2Event = {
        httpMethod: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({
          repoId: 2,
          fullName: 'owner/repo2',
          selectedBranches: ['main'],
        }),
      };
      const repo2Response = await savedReposHandler(repo2Event);
      const repo2 = JSON.parse(repo2Response.body);

      // Create a group
      const createGroupEvent = {
        httpMethod: 'POST',
        headers: { 'x-user-id': userId },
        path: '/api/groups',
        body: JSON.stringify({
          name: 'Production',
          description: 'Production sites',
          repoIds: [repo1.id, repo2.id],
        }),
      };

      const createGroupResponse = await groupsHandler(createGroupEvent);
      expect(createGroupResponse.statusCode).toBe(201);

      const group = JSON.parse(createGroupResponse.body);
      expect(group.name).toBe('Production');
      expect(group.repoIds).toHaveLength(2);

      // List groups
      const listGroupsEvent = {
        httpMethod: 'GET',
        headers: { 'x-user-id': userId },
        path: '/api/groups',
      };

      const listGroupsResponse = await groupsHandler(listGroupsEvent);
      expect(listGroupsResponse.statusCode).toBe(200);

      const { groups } = JSON.parse(listGroupsResponse.body);
      expect(groups).toHaveLength(1);
    });
  });

  describe('History Filtering', () => {
    it('should filter history by status', async () => {
      // Add repo and create some history
      const addEvent = {
        httpMethod: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({
          repoId: 12345,
          fullName: 'owner/test-repo',
          selectedBranches: ['main'],
        }),
      };
      await savedReposHandler(addEvent);

      // Mock successful deployment
      fetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ object: { sha: 'abc123' }, sha: 'abc123', tree: { sha: 'tree123' } }),
      }));

      const deployEvent = {
        httpMethod: 'POST',
        headers: {
          'x-user-id': userId,
          authorization: `Bearer ${githubToken}`,
        },
        body: JSON.stringify({ action: 'deploy-all' }),
      };
      await deployHandler(deployEvent);

      // Filter by success status
      const historyEvent = {
        httpMethod: 'GET',
        headers: { 'x-user-id': userId },
        path: '/api/history',
        queryStringParameters: { status: 'success' },
      };

      const historyResponse = await historyHandler(historyEvent);
      const { history } = JSON.parse(historyResponse.body);

      expect(history.every((h) => h.status === 'success')).toBe(true);
    });

    it('should get deployment stats', async () => {
      // Add repo and deploy
      const addEvent = {
        httpMethod: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({
          repoId: 12345,
          fullName: 'owner/test-repo',
          selectedBranches: ['main'],
        }),
      };
      await savedReposHandler(addEvent);

      fetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ object: { sha: 'abc123' }, sha: 'abc123', tree: { sha: 'tree123' } }),
      }));

      const deployEvent = {
        httpMethod: 'POST',
        headers: {
          'x-user-id': userId,
          authorization: `Bearer ${githubToken}`,
        },
        body: JSON.stringify({ action: 'deploy-all' }),
      };
      await deployHandler(deployEvent);

      // Get stats
      const statsEvent = {
        httpMethod: 'GET',
        headers: { 'x-user-id': userId },
        path: '/api/history/stats',
        queryStringParameters: {},
      };

      const statsResponse = await historyHandler(statsEvent);
      expect(statsResponse.statusCode).toBe(200);

      const stats = JSON.parse(statsResponse.body);
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.successRate).toBeDefined();
    });
  });
});
