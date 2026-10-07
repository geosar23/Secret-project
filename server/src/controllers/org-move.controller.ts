/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { OrgMoveService, operationArea } from "../services/org-move.service";
import { UserService } from "../services/user.service";
import { PermissionKeys } from "../enums/permissions.enum";
import { getEffectivePermissions, matchesWildcard } from "../utils/permission-checker";
import { forbiddenError, hardError, softError, success, unauthorizedError } from "../utils/response.util";
import { IUserPopulated } from "../interfaces/user.interface";

const AREA_PERMISSION = {
    subDepartments: PermissionKeys.SUB_DEPARTMENTS_MANAGEMENT_WRITE_ALL,
    employmentTitles: PermissionKeys.EMPLOYMENT_TITLES_MANAGEMENT_WRITE_ALL,
} as const;

const canWriteArea = (actor: IUserPopulated) => {
    const effective = getEffectivePermissions(actor);
    return (area: keyof typeof AREA_PERMISSION) => matchesWildcard(effective, AREA_PERMISSION[area]);
};

export class OrgMoveController {
    static async preview(req: AuthenticatedRequest, res: Response): Promise<void> {
        await OrgMoveController.run(req, res, "preview");
    }

    static async apply(req: AuthenticatedRequest, res: Response): Promise<void> {
        await OrgMoveController.run(req, res, "apply");
    }

    static async undo(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const token = req.decoded as tokenPayload;
            const actor = await UserService.getById(token.id, token.companyId);
            if (!actor) {
                return unauthorizedError(res);
            }
            const result = await OrgMoveService.undo(actor, token.companyId, req.params.id, canWriteArea(actor));
            if (!result.ok) {
                res.json(softError(result.message, result.details));
                return;
            }
            res.json(success(result.value));
        } catch (error: any) {
            console.log("Error in OrgMoveController.undo:", error);
            return hardError(res);
        }
    }

    private static async run(req: AuthenticatedRequest, res: Response, mode: "preview" | "apply"): Promise<void> {
        try {
            const token = req.decoded as tokenPayload;
            const actor = await UserService.getById(token.id, token.companyId);
            if (!actor) {
                return unauthorizedError(res);
            }
            const body = (req.body ?? {}) as Record<string, unknown>;
            const area = operationArea(body.operation);
            if (!area) {
                res.json(softError("A valid operation is required"));
                return;
            }
            if (!canWriteArea(actor)(area)) {
                return forbiddenError(res);
            }

            const result =
                mode === "preview"
                    ? await OrgMoveService.preview(actor, token.companyId, body)
                    : await OrgMoveService.apply(actor, token.companyId, body);
            if (!result.ok) {
                res.json(softError(result.message, result.details));
                return;
            }
            res.json(success(result.value));
        } catch (error: any) {
            console.log(`Error in OrgMoveController.${mode}:`, error);
            return hardError(res);
        }
    }
}
