import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User, type CreateUserInput, type UpdateUserInput } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing function using Node.js built-in crypto
async function hashPassword(password: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password
    const password_hash = await hashPassword(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        role: input.role,
        first_name: input.first_name,
        last_name: input.last_name
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // Build update values, excluding undefined fields
    const updateValues: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.username !== undefined) updateValues['username'] = input.username;
    if (input.email !== undefined) updateValues['email'] = input.email;
    if (input.role !== undefined) updateValues['role'] = input.role;
    if (input.first_name !== undefined) updateValues['first_name'] = input.first_name;
    if (input.last_name !== undefined) updateValues['last_name'] = input.last_name;
    if (input.is_active !== undefined) updateValues['is_active'] = input.is_active;

    // Update user record
    const result = await db.update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const result = await db.select()
      .from(usersTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Fetching users failed:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Fetching user by ID failed:', error);
    throw error;
  }
}

export async function deactivateUser(id: number): Promise<{ success: boolean }> {
  try {
    const result = await db.update(usersTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('User deactivation failed:', error);
    throw error;
  }
}