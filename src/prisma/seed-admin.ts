import "dotenv/config";

import { db } from "./db.js";
import { hashPassword } from "../utils/password.util.js";

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME ?? "System Admin";
  const userName = process.env.ADMIN_USERNAME ?? "admin";

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required in environment variables",
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  console.log("Checking admin account...");

  const existingAdmin = await db.orm.public.User.select(
    "id",
    "email",
    "role",
  ).first({
    email,
  });

  if (existingAdmin) {
    console.log(`Admin already exists: ${existingAdmin.email}`);
    return;
  }

  const hashedPassword = await hashPassword(password);

  const admin = await db.orm.public.User.select(
    "id",
    "email",
    "userName",
    "fullName",
    "role",
    "createdAt",
  ).create({
    email,
    userName,
    fullName,
    password: hashedPassword,
    role: "SUPER_ADMIN",
  });

  console.log("Super admin created successfully.");
  console.log(`ID: ${admin.id}`);
  console.log(`Email: ${admin.email}`);
  console.log(`Role: ${admin.role}`);
};

seedAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Admin seed failed:");
    console.error(error);
    process.exit(1);
  });
