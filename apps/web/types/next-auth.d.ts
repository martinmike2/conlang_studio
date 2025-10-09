import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      id: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    hashedPassword?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
  }
}
