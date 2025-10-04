import { BcryptUtil } from './bcrypt.util';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('BcryptUtil', () => {
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'password123';
      const hashedPassword = '$2b$12$hashedpassword';

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await BcryptUtil.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'password123';
      const hashedPassword = '$2b$12$hashedpassword';

      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await BcryptUtil.comparePassword(password, hashedPassword);

      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'password123';
      const hashedPassword = '$2b$12$hashedpassword';

      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await BcryptUtil.comparePassword(password, hashedPassword);

      expect(result).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
  });

  describe('generateSalt', () => {
    it('should generate a salt', async () => {
      const salt = '$2b$12$salt';

      mockBcrypt.genSalt.mockResolvedValue(salt as never);

      const result = await BcryptUtil.generateSalt();

      expect(result).toBe(salt);
      expect(mockBcrypt.genSalt).toHaveBeenCalledWith(12);
    });
  });
});
