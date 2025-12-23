import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UserService } from "./user.service";
import { LoginDto, AuthResponse } from "../interfaces/auth.interface";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const AuthService = {
    async login(credentials: LoginDto): Promise<AuthResponse> {
        const { email, password } = credentials;

        // Find user by email
        const user = await UserService.getByEmail(email);
        if (!user) {
            throw new Error("Invalid credentials");
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new Error("Invalid credentials");
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: (user.role as unknown as { role: string }).role.toString(),
                permissions: [],
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        return {
            token,
            user: {
                id: user._id.toString() || "",
                email: user.email,
                name: user.name,
                role: user.role.toString() || "",
            },
        };
    },

    verifyToken(token: string): jwt.JwtPayload | string {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch {
            throw new Error("Invalid token");
        }
    },
};
