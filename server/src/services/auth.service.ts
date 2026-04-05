import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UserService } from "./user.service";
import { LoginDto, AuthResponse } from "../interfaces/auth.interface";
import { config } from "../config/env";

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = config.JWT_EXPIRES_IN;

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
                roleId: (user.role as unknown as { role: string }).role.toString(),
                companyId: user.company?._id.toString(),
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        return {
            token,
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
