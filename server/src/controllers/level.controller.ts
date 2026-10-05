/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { LevelService } from "../services/level.service";
import { hardError, softError, success } from "../utils/response.util";
import { findActiveDependents } from "../services/dependency.service";

export class LevelController {
    static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const levels = await LevelService.getAll(requestingUser.companyId);
            res.json(success(levels));
        } catch (error: any) {
            console.log("Error in LevelController.getAll:", error);
            return hardError(res);
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const level = await LevelService.getById(req.params.id, requestingUser.companyId);
            if (!level) {
                res.json(softError("Level not found"));
                return;
            }
            res.json(success(level));
        } catch (error: any) {
            console.log("Error in LevelController.getById:", error);
            return hardError(res);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const { name, order } = req.body as { name?: string; order?: unknown };

            if (!name || typeof name !== "string" || name.trim().length < 1) {
                res.json(softError("Level name is required"));
                return;
            }

            const level = await LevelService.create(
                {
                    name: name.trim(),
                    order: typeof order === "number" ? order : 0,
                    isActive: true,
                },
                requestingUser.companyId,
            );
            res.json(success(level));
        } catch (error: any) {
            console.log("Error in LevelController.create:", error);
            return hardError(res);
        }
    }

    static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const { name, order, isActive } = req.body as { name?: string; order?: unknown; isActive?: unknown };
            const data: Record<string, unknown> = {};

            if (name !== undefined) {
                if (typeof name !== "string" || name.trim().length < 1) {
                    res.json(softError("Level name cannot be empty"));
                    return;
                }
                data.name = name.trim();
            }
            if (order !== undefined && typeof order === "number") {
                data.order = order;
            }
            if (isActive !== undefined && typeof isActive === "boolean") {
                data.isActive = isActive;
            }

            if (data.isActive === false) {
                const blocker = await findActiveDependents("level", req.params.id, requestingUser.companyId);
                if (blocker) {
                    res.json(softError(blocker));
                    return;
                }
            }

            const updated = await LevelService.update(req.params.id, data, requestingUser.companyId);
            if (!updated) {
                res.json(softError("Level not found"));
                return;
            }
            res.json(success(updated));
        } catch (error: any) {
            console.log("Error in LevelController.update:", error);
            return hardError(res);
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            await LevelService.delete(req.params.id, requestingUser.companyId);
            res.json(success({}));
        } catch (error: any) {
            console.log("Error in LevelController.delete:", error);
            return hardError(res);
        }
    }
}
