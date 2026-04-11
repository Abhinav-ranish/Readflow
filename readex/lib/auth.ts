import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { db } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
    ],
    session: { strategy: 'jwt' },
    callbacks: {
        async signIn({ user, account }) {
            if (!user.email || !account) return false;
            await db.findOrCreateUser(
                user.email,
                user.name || undefined,
                user.image || undefined,
                account.provider,
                account.providerAccountId,
            );
            return true;
        },
        async jwt({ token, account }) {
            if (account && token.email) {
                const dbUser = await db.findOrCreateUser(
                    token.email,
                    token.name || undefined,
                    (token.picture as string) || undefined,
                    account.provider,
                    account.providerAccountId,
                );
                token.dbId = dbUser.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.dbId) {
                (session.user as any).dbId = token.dbId as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
});
