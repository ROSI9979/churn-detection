import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

// In production, replace this with a real database
// For now, using in-memory storage (resets on server restart)
const users: { id: string; email: string; name: string; password: string }[] = []

const handler = NextAuth({
  providers: [
    // Google Sign-In
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),

    // Email + Password
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        isSignUp: { label: 'Is Sign Up', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required')
        }

        const isSignUp = credentials.isSignUp === 'true'

        if (isSignUp) {
          // Sign Up - Create new user
          const existingUser = users.find(u => u.email === credentials.email)
          if (existingUser) {
            throw new Error('User already exists')
          }

          const hashedPassword = await bcrypt.hash(credentials.password, 10)
          const newUser = {
            id: Date.now().toString(),
            email: credentials.email,
            name: credentials.name || credentials.email.split('@')[0],
            password: hashedPassword,
          }
          users.push(newUser)

          return { id: newUser.id, email: newUser.email, name: newUser.name }
        } else {
          // Sign In - Verify existing user
          const user = users.find(u => u.email === credentials.email)
          if (!user) {
            throw new Error('No account found with this email')
          }

          const isValid = await bcrypt.compare(credentials.password, user.password)
          if (!isValid) {
            throw new Error('Invalid password')
          }

          return { id: user.id, email: user.email, name: user.name }
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
})

export { handler as GET, handler as POST }
