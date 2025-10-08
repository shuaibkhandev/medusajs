import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import { Modules } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

export default defineConfig({
  projectConfig: {
    // Database
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: { connection: { ssl: false } },

    // HTTP Settings
    http: {
      storeCors: process.env.STORE_CORS || "*",
      adminCors: process.env.ADMIN_CORS || "*",
      authCors: process.env.AUTH_CORS || "*",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },

  // 🧩 Register all modules here
  modules: {
    // ✅ Enables the new Product Module
    [Modules.PRODUCT]: {
      resolve: "@medusajs/product",
      options: {},
    },
    // (optional: add more modules like pricing, inventory, etc.)
  },

  // Optional plugins or other custom modules
  plugins: [],
})
