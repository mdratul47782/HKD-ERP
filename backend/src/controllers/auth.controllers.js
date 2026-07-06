import { eq } from "drizzle-orm";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { db, schema, insertAndReturn, updateAndReturn } from "../db/db.js";

const { users } = schema;

const isBase64Image = (str) =>
  typeof str === "string" && str.startsWith("data:image/");

// POST /auth/register
export const register = async (req, res) => {
  try {
    const { user_name, password, role, assigned_building, factory, profile_picture } = req.body;

    if (!user_name || !password || !role || !assigned_building || !factory) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await db.select().from(users).where(eq(users.user_name, user_name));
    if (existing.length > 0) {
      return res.status(400).json({ message: "Username already taken" });
    }

    let pictureUrl = null;
    let pictureId = null;
    if (profile_picture && isBase64Image(profile_picture)) {
      const uploaded = await uploadToCloudinary(profile_picture);
      pictureUrl = uploaded.url;
      pictureId = uploaded.public_id;
    }

    const newUser = await insertAndReturn(users, {
      user_name, password, role, assigned_building, factory,
      profile_picture: pictureUrl,
      profile_picture_id: pictureId,
    });

    return res.status(201).json({
      user: {
        id: newUser.id,
        user_name: newUser.user_name,
        role: newUser.role,
        assigned_building: newUser.assigned_building,
        factory: newUser.factory,
        profile_picture: newUser.profile_picture,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /auth/login
export const login = async (req, res) => {
  try {
    const { user_name, password } = req.body;

    if (!user_name || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const [user] = await db.select().from(users).where(eq(users.user_name, user_name));

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        user_name: user.user_name,
        role: user.role,
        assigned_building: user.assigned_building,
        factory: user.factory,
        profile_picture: user.profile_picture,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /auth/refresh
export const refresh = async (req, res) => {
  try {
    const { user_name } = req.body;
    if (!user_name) return res.status(400).json({ message: "Username required" });

    const [user] = await db.select().from(users).where(eq(users.user_name, user_name));
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      user: {
        id: user.id,
        user_name: user.user_name,
        role: user.role,
        assigned_building: user.assigned_building,
        factory: user.factory,
        profile_picture: user.profile_picture,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /auth/update
export const updateUser = async (req, res) => {
  try {
    const { old_user_name, user_name, role, assigned_building, factory, profile_picture } = req.body;

    if (!user_name) return res.status(400).json({ message: "Username required" });

    const [existing] = await db.select().from(users).where(eq(users.user_name, old_user_name));
    if (!existing) return res.status(404).json({ message: "User not found" });

    if (user_name !== old_user_name) {
      const [duplicate] = await db.select().from(users).where(eq(users.user_name, user_name));
      if (duplicate) return res.status(400).json({ message: "Username already taken" });
    }

    let pictureUrl = existing.profile_picture;
    let pictureId = existing.profile_picture_id;

    if (profile_picture === null) {
      await deleteFromCloudinary(existing.profile_picture_id);
      pictureUrl = null;
      pictureId = null;
    } else if (profile_picture && isBase64Image(profile_picture)) {
      await deleteFromCloudinary(existing.profile_picture_id);
      const uploaded = await uploadToCloudinary(profile_picture);
      pictureUrl = uploaded.url;
      pictureId = uploaded.public_id;
    }

    const updatedUser = await updateAndReturn(
      users,
      {
        user_name: user_name || existing.user_name,
        role: role || existing.role,
        assigned_building: assigned_building || existing.assigned_building,
        factory: factory || existing.factory,
        profile_picture: pictureUrl,
        profile_picture_id: pictureId,
      },
      eq(users.user_name, old_user_name)
    );

    return res.status(200).json({
      user: {
        id: updatedUser.id,
        user_name: updatedUser.user_name,
        role: updatedUser.role,
        assigned_building: updatedUser.assigned_building,
        factory: updatedUser.factory,
        profile_picture: updatedUser.profile_picture,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { user_name, current_password, new_password } = req.body;

    if (!user_name || !current_password || !new_password) {
      return res.status(400).json({ message: "All password fields are required" });
    }
    if (new_password.length < 4) {
      return res.status(400).json({ message: "Password must be at least 4 characters" });
    }

    const [existing] = await db.select().from(users).where(eq(users.user_name, user_name));
    if (!existing) return res.status(404).json({ message: "User not found" });
    if (existing.password !== current_password) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    await db.update(users).set({ password: new_password }).where(eq(users.user_name, user_name));

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};