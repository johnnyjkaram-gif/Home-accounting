import { type NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { household: true },
        });

        // Constant-shape response to avoid user-enumeration timing differences.
        const dummyHash = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Fw.5X4EOFy0.EmxT6RB2M6IY6JZLK';
        const valid = await bcrypt.compare(credentials.password, user?.passwordHash ?? dummyHash);

        if (!user || !valid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          householdId: user.householdId,
          baseCurrency: user.household.baseCurrency,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.householdId = (user as any).householdId;
        token.baseCurrency = (user as any).baseCurrency;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.householdId = token.householdId as string;
        session.user.baseCurrency = token.baseCurrency as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Convenience wrapper for server components / route handlers. */
export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session?.user) {
    throw new Error('UNAUTHENTICATED');
  }
  return session;
}

/** Role hierarchy used for lightweight authorization checks. */
const ROLE_RANK: Record<string, number> = {
  VIEWER: 0,
  REPORTS_ONLY: 0,
  MEMBER: 1,
  ADMIN: 2,
};

export function canWrite(role: string | undefined): boolean {
  return (ROLE_RANK[role ?? ''] ?? 0) >= 1;
}

export function isAdmin(role: string | undefined): boolean {
  return role === 'ADMIN';
}
