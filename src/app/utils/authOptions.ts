import { DefaultSession, Session, AuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectMongoose, supabase } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authRateLimiter } from "@/lib/rate-limit";

declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        sessionDuration?: number;
    }
}

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                if (!authRateLimiter.check(`login:${credentials.email}`)) {
                    throw new Error('Too many login attempts. Please try again later.');
                }

                await connectMongoose();
                const { data: user, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', credentials.email)
                    .maybeSingle();

                if (error || !user) {
                    return null;
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    sessionDuration: user.session_duration || 10080,
                };
            }
        })
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user, trigger, session }: { token: JWT, user: any, trigger?: string, session?: any }) {
            if (user) {
                token.id = user.id;
                token.sessionDuration = user.sessionDuration || 10080;
            }
            
            // Allow update of session duration on the fly if user changes settings
            if (trigger === "update" && session?.sessionDuration) {
                token.sessionDuration = session.sessionDuration;
            }

            // Dynamically set JWT expiration relative to current request time (sliding expiry)
            const now = Math.floor(Date.now() / 1000);
            const durationInSeconds = (token.sessionDuration || 10080) * 60;
            token.exp = now + durationInSeconds;

            return token;
        },
        async session({ session, token }: { session: Session, token: JWT }) {
            if (session.user) {
                session.user.id = token.id;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt" as const,
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    secret: process.env.NEXTAUTH_SECRET,
}; 