/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { OfficeService } from "../services/office.service";
import { softError, success } from "../utils/response.util";
import { isValidObjectId } from "../utils/field-sanitizer.util";
import { IAddress } from "../interfaces/user.interface";

function sanitizeAddress(raw: Record<string, unknown>): IAddress {
    const result: IAddress = {};
    if (typeof raw.line1 === "string") result.line1 = raw.line1.trim();
    if (typeof raw.line2 === "string") result.line2 = raw.line2.trim();
    if (typeof raw.city === "string") result.city = raw.city.trim();
    if (typeof raw.state === "string") result.state = raw.state.trim();
    if (typeof raw.postalCode === "string") result.postalCode = raw.postalCode.trim();
    if (typeof raw.country === "string") result.country = raw.country.trim();
    return result;
}

export class OfficeController {
    static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const offices = await OfficeService.getAll(requestingUser.companyId);
            res.json(success(offices));
        } catch (error: any) {
            console.log("Error in OfficeController.getAll:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const office = await OfficeService.getById(req.params.id, requestingUser.companyId);
            if (!office) {
                res.json(softError("Office not found"));
                return;
            }
            res.json(success(office));
        } catch (error: any) {
            console.log("Error in OfficeController.getById:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const { name, countryId, address } = req.body as {
                name?: string;
                countryId?: string;
                address?: Record<string, unknown>;
            };

            if (!name || typeof name !== "string" || name.trim().length < 1) {
                res.json(softError("Office name is required"));
                return;
            }

            const data: Record<string, unknown> = { name: name.trim(), isActive: true };
            if (countryId && isValidObjectId(countryId)) data.country = countryId;
            if (address && typeof address === "object") data.address = sanitizeAddress(address);

            const office = await OfficeService.create(data as any, requestingUser.companyId);
            res.json(success(office));
        } catch (error: any) {
            console.log("Error in OfficeController.create:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const { name, countryId, address, isActive } = req.body as {
                name?: string;
                countryId?: unknown;
                address?: Record<string, unknown>;
                isActive?: unknown;
            };
            const data: Record<string, unknown> = {};

            if (name !== undefined) {
                if (typeof name !== "string" || name.trim().length < 1) {
                    res.json(softError("Office name cannot be empty"));
                    return;
                }
                data.name = name.trim();
            }
            if (countryId !== undefined) {
                data.country = typeof countryId === "string" && isValidObjectId(countryId) ? countryId : null;
            }
            if (address !== undefined) {
                data.address = address && typeof address === "object" ? sanitizeAddress(address) : null;
            }
            if (isActive !== undefined && typeof isActive === "boolean") data.isActive = isActive;

            const updated = await OfficeService.update(req.params.id, data as any, requestingUser.companyId);
            if (!updated) {
                res.json(softError("Office not found"));
                return;
            }
            res.json(success(updated));
        } catch (error: any) {
            console.log("Error in OfficeController.update:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            await OfficeService.delete(req.params.id, requestingUser.companyId);
            res.json(success({}));
        } catch (error: any) {
            console.log("Error in OfficeController.delete:", error);
            res.json(softError(error.message, error));
            next(error);
        }
    }
}
