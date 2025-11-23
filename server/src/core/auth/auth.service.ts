import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UserService } from "../../modules/users/user.service";
import { UserRole } from "../../enums";
import { LoginDto, RegisterDto, AuthResponse } from "../../interfaces";

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
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        return {
            token,
            user: {
                id: user._id || "",
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    },

    async register(data: RegisterDto): Promise<AuthResponse> {
        const { name, email, password, role = UserRole.EMPLOYEE } = data;

        // Check if user already exists
        const existingUser = await UserService.getByEmail(email);
        if (existingUser) {
            throw new Error("User already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await UserService.create({
            name,
            email,
            password: hashedPassword,
            role,
            isActive: true,
            createdAt: new Date(),
        });

        // Generate JWT token
        const token = jwt.sign(
            {
                id: newUser._id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        return {
            token,
            user: {
                id: newUser._id || "",
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
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
