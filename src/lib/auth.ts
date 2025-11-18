import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const extendedUser = user as User & { role: string };
        token.id = extendedUser.id;
        token.role = extendedUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const extendedUser = session.user as typeof session.user & { id: string; role: string };
        extendedUser.id = token.id as string;
        extendedUser.role = token.role as string;
      }
      return session;
    },
  },
};