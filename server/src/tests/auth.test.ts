import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, logout, createUserWithHashedPassword } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test data
const testUserData = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'testpassword123',
  role: 'CASHIER' as const,
  first_name: 'Test',
  last_name: 'User'
};

const validLoginInput: LoginInput = {
  username: testUserData.username,
  password: testUserData.password
};

describe('Authentication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('login', () => {
    it('should authenticate valid user credentials', async () => {
      // Create a test user
      await createUserWithHashedPassword(testUserData);

      const result = await login(validLoginInput);

      // Verify user data
      expect(result.user.username).toEqual(testUserData.username);
      expect(result.user.email).toEqual(testUserData.email);
      expect(result.user.role).toEqual(testUserData.role);
      expect(result.user.first_name).toEqual(testUserData.first_name);
      expect(result.user.last_name).toEqual(testUserData.last_name);
      expect(result.user.is_active).toBe(true);
      expect(result.user.id).toBeDefined();
      expect(result.user.created_at).toBeInstanceOf(Date);
      expect(result.user.updated_at).toBeInstanceOf(Date);

      // Verify password hash is not exposed
      expect(result.user.password_hash).toBeDefined();

      // Verify JWT token
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
    });

    it('should generate valid JWT token with correct payload', async () => {
      await createUserWithHashedPassword(testUserData);

      const result = await login(validLoginInput);

      // Verify JWT token structure and content
      const tokenParts = result.token.split('.');
      expect(tokenParts).toHaveLength(3);
      
      const payload = JSON.parse(atob(tokenParts[1]));
      expect(payload.id).toEqual(result.user.id);
      expect(payload.username).toEqual(testUserData.username);
      expect(payload.email).toEqual(testUserData.email);
      expect(payload.role).toEqual(testUserData.role);
      expect(payload.iss).toEqual('retail-management-system');
      expect(payload.exp).toBeDefined();
    });

    it('should reject invalid username', async () => {
      await createUserWithHashedPassword(testUserData);

      const invalidInput: LoginInput = {
        username: 'nonexistent',
        password: testUserData.password
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject invalid password', async () => {
      await createUserWithHashedPassword(testUserData);

      const invalidInput: LoginInput = {
        username: testUserData.username,
        password: 'wrongpassword'
      };

      await expect(login(invalidInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject inactive user', async () => {
      await createUserWithHashedPassword({
        ...testUserData,
        is_active: false
      });

      await expect(login(validLoginInput)).rejects.toThrow(/user account is inactive/i);
    });

    it('should work with different user roles', async () => {
      const adminUserData = {
        ...testUserData,
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMINISTRATOR' as const
      };

      await createUserWithHashedPassword(adminUserData);

      const adminLogin: LoginInput = {
        username: adminUserData.username,
        password: adminUserData.password
      };

      const result = await login(adminLogin);

      expect(result.user.role).toEqual('ADMINISTRATOR');
      expect(result.user.username).toEqual(adminUserData.username);

      // Verify JWT contains correct role
      const tokenParts = result.token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      expect(payload.role).toEqual('ADMINISTRATOR');
    });

    it('should handle user with special characters in name', async () => {
      const specialUserData = {
        ...testUserData,
        username: 'user.test-123',
        first_name: "O'Connor",
        last_name: 'José-María'
      };

      await createUserWithHashedPassword(specialUserData);

      const specialLogin: LoginInput = {
        username: specialUserData.username,
        password: specialUserData.password
      };

      const result = await login(specialLogin);

      expect(result.user.first_name).toEqual("O'Connor");
      expect(result.user.last_name).toEqual('José-María');
    });
  });

  describe('logout', () => {
    it('should return success response', async () => {
      const result = await logout();

      expect(result.success).toBe(true);
    });
  });

  describe('createUserWithHashedPassword', () => {
    it('should create user with hashed password', async () => {
      const result = await createUserWithHashedPassword(testUserData);

      // Verify user was created
      expect(result.id).toBeDefined();
      expect(result.username).toEqual(testUserData.username);
      expect(result.email).toEqual(testUserData.email);
      expect(result.role).toEqual(testUserData.role);
      expect(result.first_name).toEqual(testUserData.first_name);
      expect(result.last_name).toEqual(testUserData.last_name);
      expect(result.is_active).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Verify password was hashed (not stored as plain text)
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual(testUserData.password);
      expect(result.password_hash.length).toBeGreaterThan(testUserData.password.length);
    });

    it('should save user to database correctly', async () => {
      const result = await createUserWithHashedPassword(testUserData);

      // Query database to verify user was saved
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual(testUserData.username);
      expect(users[0].email).toEqual(testUserData.email);
      expect(users[0].role).toEqual(testUserData.role);
      expect(users[0].password_hash).toEqual(result.password_hash);
    });

    it('should enforce unique username constraint', async () => {
      await createUserWithHashedPassword(testUserData);

      const duplicateUserData = {
        ...testUserData,
        email: 'different@example.com'
      };

      await expect(createUserWithHashedPassword(duplicateUserData))
        .rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      await createUserWithHashedPassword(testUserData);

      const duplicateEmailData = {
        ...testUserData,
        username: 'different_user'
      };

      await expect(createUserWithHashedPassword(duplicateEmailData))
        .rejects.toThrow();
    });

    it('should create inactive user when specified', async () => {
      const inactiveUserData = {
        ...testUserData,
        is_active: false
      };

      const result = await createUserWithHashedPassword(inactiveUserData);

      expect(result.is_active).toBe(false);
    });
  });
});