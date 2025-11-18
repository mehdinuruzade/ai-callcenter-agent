"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOptions = void 0;
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
const prisma_1 = require("@/lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.authOptions = {
    providers: [
        (0, credentials_1.default)({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                const user = await prisma_1.prisma.user.findUnique({
                    where: { email: credentials.email },
                });
                if (!user) {
                    return null;
                }
                const isPasswordValid = await bcryptjs_1.default.compare(credentials.password, user.password);
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
                const extendedUser = user;
                token.id = extendedUser.id;
                token.role = extendedUser.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const extendedUser = session.user;
                extendedUser.id = token.id;
                extendedUser.role = token.role;
            }
            return session;
        },
    },
};
