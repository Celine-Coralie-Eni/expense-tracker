import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { twoFactor } from "better-auth/plugins"
import { PrismaClient } from "@prisma/client"

const authPrisma = new PrismaClient({
  log: ['error', 'warn'],
})

export const auth = betterAuth({
  database: prismaAdapter(authPrisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if you want email verification
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    twoFactor({
      issuer: "Expense Tracker",
      otpOptions: {
        period: 30,
        digits: 6,
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key-change-in-production",
  baseURL: "http://localhost:3000",
  trustedOrigins: ["http://localhost:3000"],
  logger: {
    level: "debug",
    verboseLogging: true,
    disabled: false,
  },
})

export type Session = typeof auth.$Infer.Session
