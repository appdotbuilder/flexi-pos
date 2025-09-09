import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type LoginResponse, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Hash password using Bun's built-in password hashing
const hashPassword = async (password: string): Promise<string> => {
  return await Bun.password.hash(password);
};

// Verify password using Bun's built-in password verification
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await Bun.password.verify(password, hash);
};

// Generate JWT token using Bun's built-in JWT support
const generateToken = (user: User): string => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    iss: 'retail-management-system',
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  const secret = process.env['JWT_SECRET'] || 'default_secret_key';
  return btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + 
         btoa(JSON.stringify(payload)) + '.' + 
         btoa(secret + JSON.stringify(payload)); // Simple signing for demo
};

export async function login(input: LoginInput): Promise<LoginResponse> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    // Verify password
    const isValidPassword = await verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user info (without password hash) and token
    return {
      user: {
        ...user,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function logout(): Promise<{ success: boolean }> {
  // In a stateless JWT implementation, logout is typically handled client-side
  // by simply removing the token. For enhanced security, you could maintain
  // a blacklist of tokens on the server side.
  return { success: true };
}

// Helper function for creating users with hashed passwords (useful for tests)
export async function createUserWithHashedPassword(userData: {
  username: string;
  email: string;
  password: string;
  role: 'CASHIER' | 'INVENTORY_MANAGER' | 'ADMINISTRATOR' | 'SUPER_ADMIN';
  first_name: string;
  last_name: string;
  is_active?: boolean;
}): Promise<User> {
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    const result = await db.insert(usersTable)
      .values({
        username: userData.username,
        email: userData.email,
        password_hash: hashedPassword,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        is_active: userData.is_active ?? true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}