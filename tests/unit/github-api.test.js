/**
 * GitHub API Tests
 * Phase 2.1 - GitHub Integration TDD
 */

// Mock fetch for testing
global.fetch = jest.fn();

const {
  fetchUserRepos,
  fetchAllUserRepos,
  fetchRepoBranches,
  validateGitHubToken,
  GitHubApiError,
} = require('../../netlify/functions/github-api');

describe('GitHub API', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('validateGitHubToken', () => {
    it('should return true for valid token', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'testuser' }),
      });

      const result = await validateGitHubToken('valid_token');
      expect(result).toEqual({ valid: true, login: 'testuser' });
    });

    it('should return false for invalid token', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Bad credentials' }),
      });

      const result = await validateGitHubToken('invalid_token');
      expect(result).toEqual({ valid: false, error: 'Bad credentials' });
    });

    it('should throw error on network failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(validateGitHubToken('token')).rejects.toThrow('Network error');
    });
  });

  describe('fetchUserRepos', () => {
    const mockRepos = [
      { id: 1, name: 'repo1', full_name: 'user/repo1', default_branch: 'main' },
      { id: 2, name: 'repo2', full_name: 'user/repo2', default_branch: 'master' },
    ];

    it('should fetch user repositories successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['link', '']]),
        json: async () => mockRepos,
      });

      const result = await fetchUserRepos('valid_token');
      expect(result.repos).toEqual(mockRepos);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.github.com/user/repos'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid_token',
          }),
        })
      );
    });

    it('should handle pagination parameters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['link', '']]),
        json: async () => mockRepos,
      });

      await fetchUserRepos('token', { page: 2, perPage: 50 });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=50'),
        expect.any(Object)
      );
    });

    it('should return pagination info from Link header', async () => {
      const linkHeader =
        '<https://api.github.com/user/repos?page=2>; rel="next", <https://api.github.com/user/repos?page=5>; rel="last"';
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['link', linkHeader]]),
        json: async () => mockRepos,
      });

      const result = await fetchUserRepos('token');
      expect(result.pagination).toEqual({
        hasNext: true,
        nextPage: 2,
        lastPage: 5,
      });
    });

    it('should throw GitHubApiError on API failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'API rate limit exceeded' }),
      });

      try {
        await fetchUserRepos('token');
        fail('Expected GitHubApiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubApiError);
        expect(error.status).toBe(403);
        expect(error.message).toBe('API rate limit exceeded');
      }
    });

    it('should filter repos by type', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Map([['link', '']]),
        json: async () => mockRepos,
      });

      await fetchUserRepos('token', { type: 'owner' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=owner'),
        expect.any(Object)
      );
    });
  });

  describe('fetchAllUserRepos', () => {
    it('should fetch all pages of repositories', async () => {
      const page1 = [{ id: 1, name: 'repo1' }];
      const page2 = [{ id: 2, name: 'repo2' }];

      fetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([
            ['link', '<https://api.github.com/user/repos?page=2>; rel="next"'],
          ]),
          json: async () => page1,
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([['link', '']]),
          json: async () => page2,
        });

      const result = await fetchAllUserRepos('token');
      expect(result).toEqual([...page1, ...page2]);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should respect maxPages limit', async () => {
      const mockPage = [{ id: 1, name: 'repo1' }];

      fetch.mockResolvedValue({
        ok: true,
        headers: new Map([
          ['link', '<https://api.github.com/user/repos?page=999>; rel="next"'],
        ]),
        json: async () => mockPage,
      });

      const result = await fetchAllUserRepos('token', { maxPages: 3 });
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('fetchRepoBranches', () => {
    const mockBranches = [
      { name: 'main', protected: true },
      { name: 'develop', protected: false },
    ];

    it('should fetch repository branches', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBranches,
      });

      const result = await fetchRepoBranches('token', 'owner', 'repo');
      expect(result).toEqual(mockBranches);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/branches',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
          }),
        })
      );
    });

    it('should throw error if repo not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
      });

      await expect(fetchRepoBranches('token', 'owner', 'nonexistent')).rejects.toThrow(
        GitHubApiError
      );
    });
  });
});

describe('GitHubApiError', () => {
  it('should create error with status and message', () => {
    const error = new GitHubApiError('Rate limit exceeded', 403);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.status).toBe(403);
    expect(error.name).toBe('GitHubApiError');
  });
});
