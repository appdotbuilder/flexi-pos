import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { 
  createUser, 
  updateUser, 
  getUsers, 
  getUserById, 
  deactivateUser 
} from '../handlers/user_management';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'CASHIER',
  first_name: 'Test',
  last_name: 'User'
};

const adminUser: CreateUserInput = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'adminpass123',
  role: 'ADMINISTRATOR',
  first_name: 'Admin',
  last_name: 'User'
};

describe('User Management', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a user with hashed password', async () => {
      const result = await createUser(testUser);

      // Basic field validation
      expect(result.username).toEqual('testuser');
      expect(result.email).toEqual('test@example.com');
      expect(result.role).toEqual('CASHIER');
      expect(result.first_name).toEqual('Test');
      expect(result.last_name).toEqual('User');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Password should be hashed, not plain text
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123');
      expect(result.password_hash.length).toBeGreaterThan(10);
    });

    it('should save user to database', async () => {
      const result = await createUser(testUser);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('testuser');
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].role).toEqual('CASHIER');
      expect(users[0].is_active).toBe(true);
    });

    it('should create users with different roles', async () => {
      const cashier = await createUser(testUser);
      const admin = await createUser(adminUser);

      expect(cashier.role).toEqual('CASHIER');
      expect(admin.role).toEqual('ADMINISTRATOR');
    });

    it('should reject duplicate usernames', async () => {
      await createUser(testUser);

      const duplicateUser: CreateUserInput = {
        ...testUser,
        email: 'different@example.com'
      };

      await expect(createUser(duplicateUser)).rejects.toThrow();
    });

    it('should reject duplicate emails', async () => {
      await createUser(testUser);

      const duplicateUser: CreateUserInput = {
        ...testUser,
        username: 'differentuser'
      };

      await expect(createUser(duplicateUser)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const user = await createUser(testUser);

      const updateData: UpdateUserInput = {
        id: user.id,
        username: 'updateduser',
        email: 'updated@example.com',
        first_name: 'Updated',
        last_name: 'Name'
      };

      const result = await updateUser(updateData);

      expect(result.id).toEqual(user.id);
      expect(result.username).toEqual('updateduser');
      expect(result.email).toEqual('updated@example.com');
      expect(result.first_name).toEqual('Updated');
      expect(result.last_name).toEqual('Name');
      expect(result.role).toEqual('CASHIER'); // Should remain unchanged
      expect(result.is_active).toBe(true); // Should remain unchanged
      expect(result.updated_at.getTime()).toBeGreaterThan(user.updated_at.getTime());
    });

    it('should update user role', async () => {
      const user = await createUser(testUser);

      const updateData: UpdateUserInput = {
        id: user.id,
        role: 'ADMINISTRATOR'
      };

      const result = await updateUser(updateData);

      expect(result.role).toEqual('ADMINISTRATOR');
      expect(result.username).toEqual('testuser'); // Should remain unchanged
    });

    it('should update user active status', async () => {
      const user = await createUser(testUser);

      const updateData: UpdateUserInput = {
        id: user.id,
        is_active: false
      };

      const result = await updateUser(updateData);

      expect(result.is_active).toBe(false);
    });

    it('should save updated user to database', async () => {
      const user = await createUser(testUser);

      const updateData: UpdateUserInput = {
        id: user.id,
        username: 'updateduser',
        role: 'ADMINISTRATOR'
      };

      await updateUser(updateData);

      const dbUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(dbUser[0].username).toEqual('updateduser');
      expect(dbUser[0].role).toEqual('ADMINISTRATOR');
    });

    it('should throw error for non-existent user', async () => {
      const updateData: UpdateUserInput = {
        id: 999,
        username: 'nonexistent'
      };

      await expect(updateUser(updateData)).rejects.toThrow(/not found/i);
    });
  });

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getUsers();
      expect(result).toHaveLength(0);
    });

    it('should return all users', async () => {
      await createUser(testUser);
      await createUser(adminUser);

      const result = await getUsers();

      expect(result).toHaveLength(2);
      expect(result.map(u => u.username)).toContain('testuser');
      expect(result.map(u => u.username)).toContain('admin');
    });

    it('should return users with all required fields', async () => {
      await createUser(testUser);

      const result = await getUsers();

      expect(result).toHaveLength(1);
      const user = result[0];
      expect(user.id).toBeDefined();
      expect(user.username).toEqual('testuser');
      expect(user.email).toEqual('test@example.com');
      expect(user.password_hash).toBeDefined();
      expect(user.role).toEqual('CASHIER');
      expect(user.first_name).toEqual('Test');
      expect(user.last_name).toEqual('User');
      expect(user.is_active).toBe(true);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getUserById', () => {
    it('should return null for non-existent user', async () => {
      const result = await getUserById(999);
      expect(result).toBeNull();
    });

    it('should return user by ID', async () => {
      const user = await createUser(testUser);

      const result = await getUserById(user.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(user.id);
      expect(result!.username).toEqual('testuser');
      expect(result!.email).toEqual('test@example.com');
      expect(result!.role).toEqual('CASHIER');
    });

    it('should return correct user from multiple users', async () => {
      const user1 = await createUser(testUser);
      const user2 = await createUser(adminUser);

      const result = await getUserById(user2.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(user2.id);
      expect(result!.username).toEqual('admin');
      expect(result!.role).toEqual('ADMINISTRATOR');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate existing user', async () => {
      const user = await createUser(testUser);
      expect(user.is_active).toBe(true);

      const result = await deactivateUser(user.id);

      expect(result.success).toBe(true);

      // Verify user is deactivated in database
      const updatedUser = await getUserById(user.id);
      expect(updatedUser!.is_active).toBe(false);
      expect(updatedUser!.updated_at.getTime()).toBeGreaterThan(user.updated_at.getTime());
    });

    it('should return false for non-existent user', async () => {
      const result = await deactivateUser(999);
      expect(result.success).toBe(false);
    });

    it('should deactivate already inactive user', async () => {
      const user = await createUser(testUser);
      
      // First deactivation
      await deactivateUser(user.id);
      
      // Second deactivation
      const result = await deactivateUser(user.id);

      expect(result.success).toBe(true);

      const updatedUser = await getUserById(user.id);
      expect(updatedUser!.is_active).toBe(false);
    });

    it('should save deactivation to database', async () => {
      const user = await createUser(testUser);

      await deactivateUser(user.id);

      const dbUser = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(dbUser[0].is_active).toBe(false);
      expect(dbUser[0].updated_at.getTime()).toBeGreaterThan(user.updated_at.getTime());
    });
  });
});