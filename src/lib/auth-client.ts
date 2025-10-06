import { createAuthClient } from "better-auth/react"
import { twoFactorClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [twoFactorClient()],
})

export const { signIn, signOut, useSession } = authClient

// Google sign-in helper - use Better Auth's built-in Google OAuth
export const signInWithGoogle = async () => {
  await signIn.social({
    provider: "google",
    callbackURL: "/dashboard",
  })
}
