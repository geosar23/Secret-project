import { Request, Response } from "express";
import { UserService } from "./user.service";

export const UserController = {
  getAll: async (req: Request, res: Response) => {
    const users = await UserService.getAll();
    res.json(users);
  },

  create: async (req: Request, res: Response) => {
    const newUser = await UserService.create(req.body);
    res.status(201).json(newUser);
  }
};
