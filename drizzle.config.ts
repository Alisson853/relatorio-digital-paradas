import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // DATABASE_URL é o nome usado no CI; o Neon/Vercel local também expõe
    // POSTGRES_URL. Aceitar ambos evita que uma migração local fique sem
    // conexão apenas por diferença de nomenclatura.
    url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL!,
  },
});
