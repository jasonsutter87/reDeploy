/**
 * Sample test file to verify Jest is working correctly
 */

describe('Jest Setup Verification', () => {
  describe('Basic assertions', () => {
    it('should perform basic equality checks', () => {
      expect(1 + 1).toBe(2);
      expect('hello').toBe('hello');
    });

    it('should handle truthy/falsy values', () => {
      expect(true).toBeTruthy();
      expect(false).toBeFalsy();
      expect(null).toBeNull();
      expect(undefined).toBeUndefined();
    });

    it('should compare objects correctly', () => {
      const obj = { name: 'reDeploy', version: '0.1.0' };
      expect(obj).toEqual({ name: 'reDeploy', version: '0.1.0' });
      expect(obj).toHaveProperty('name');
    });

    it('should work with arrays', () => {
      const arr = [1, 2, 3];
      expect(arr).toHaveLength(3);
      expect(arr).toContain(2);
    });
  });

  describe('Async operations', () => {
    it('should handle promises', async () => {
      const asyncValue = await Promise.resolve('async result');
      expect(asyncValue).toBe('async result');
    });

    it('should handle rejected promises', async () => {
      await expect(Promise.reject(new Error('test error'))).rejects.toThrow('test error');
    });
  });
});
