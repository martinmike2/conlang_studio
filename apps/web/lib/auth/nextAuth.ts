import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { getDb, schema } from '@db/client'
import { eq } from 'drizzle-orm'
import { compare } from 'bcryptjs'
import { z } from 'zod'

const db = getDb()

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens
  }),
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/signin'
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      authorize: async (rawCredentials) => {
        const parsed = credentialsSchema.safeParse({
          email: rawCredentials?.email,
          password: rawCredentials?.password
        })
        if (!parsed.success) return null
        const { email, password } = parsed.data
        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email.toLowerCase()))
          .limit(1)
        if (!user?.hashedPassword) return null
        const valid = await compare(password, user.hashedPassword)
        if (!valid) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email ?? token.email
        token.name = user.name ?? token.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (token?.sub) session.user.id = token.sub
        if (token?.email) session.user.email = token.email
        if (token?.name) session.user.name = token.name
      }
      return session
    }
  },
  secret: (() => {
    const fromEnv = process.env.NEXTAUTH_SECRET
    if (fromEnv) return fromEnv
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] NEXTAUTH_SECRET not set; using fallback dev secret')
      return 'dev-nextauth-secret'
    }
    throw new Error('NEXTAUTH_SECRET environment variable must be defined in production environments')
  })()
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
