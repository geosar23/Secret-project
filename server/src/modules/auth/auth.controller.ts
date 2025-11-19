import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const AuthController = {
    login: async (req: Request, res: Response) => {
        // Mock login (you can replace with real logic)
        const token = jwt.sign({ id: "123", role: "admin" }, process.env.JWT_SECRET || "", {
            expiresIn: "1d",
        });

        res.json({ token });
    },
};
