import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserService } from '../users/user.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    name: string;
    email: string;
    password: string;
    role?: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}

export const AuthService = {
    async login(credentials: LoginDto): Promise<AuthResponse> {
        const { email, password } = credentials;

        // Find user by email
        const user = await UserService.getByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    },

    async register(data: RegisterDto): Promise<AuthResponse> {
        const { name, email, password, role = 'employee' } = data;

        // Check if user already exists
        const existingUser = await UserService.getByEmail(email);
        if (existingUser) {
            throw new Error('User already exists');
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
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions,
        );

        return {
            token,
            user: {
                id: newUser.id,
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
            throw new Error('Invalid token');
        }
    },
};
