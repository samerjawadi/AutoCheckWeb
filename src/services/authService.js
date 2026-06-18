import { db } from "./localDB.js";

// Simple password hash (NOT cryptographically secure - for demo only!)
function simpleHash(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export const authService = {
  async addUser(name, email, password, role = "user") {
    const normalizedEmail = email?.trim() || null;
    const existing = normalizedEmail ? await db.users.getByEmail(normalizedEmail) : null;
    if (existing) {
      throw new Error("Email already in use");
    }

    const hashedPassword = simpleHash(password);
    const user = await db.users.add({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    return user;
  },

  async login(emailOrName, password) {
    const hashedPassword = simpleHash(password);

    // Try to find by email first
    let user = await db.users.getByEmail(emailOrName);

    // If not found, try by name
    if (!user) {
      const allUsers = await db.users.getAll();
      console.log("All users:", allUsers);
      console.log("Looking for name:", emailOrName);
      user = allUsers.find((u) => u.name === emailOrName);
    }

    console.log("Found user:", user);
    console.log("Input password hash:", hashedPassword);
    console.log("User password hash:", user?.password);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.password !== hashedPassword) {
      throw new Error("Invalid password");
    }

    return user;
  },

  async getUserById(id) {
    return db.users.getById(id);
  },

  async getAllUsers() {
    return db.users.getAll();
  },

  async updateUser(id, updates) {
    return db.users.update(id, updates);
  },

  async deleteUser(id) {
    return db.users.delete(id);
  },
};
