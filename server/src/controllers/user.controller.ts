/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Response } from "express";
import { UserService } from "../services/user.service";
import { AuthenticatedRequest, tokenPayload } from "../interfaces/auth.interface";
import { IUser, IUsersQueryParams } from "../interfaces/user.interface";
import { success, softError } from "../util/response.util";
import { buildUserSearchAccessQuery, canManageUser } from "../policies/user.policy";
import { DefaultUserRoles } from "../enums/user-role.enum";
import { FieldMap, setMappedFields } from "../utils/field-sanitizer.util";
import { isValidPermissionKey } from "../utils/permission-checker";
import { StorageService } from "../services/storage.service";

type UserFieldMap = FieldMap<IUser>;

export class UserController {
    static async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            // Parse query parameters
            const params: IUsersQueryParams = {
                page: req.query.page ? parseInt(req.query.page as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
                search: req.query.search as string,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as "asc" | "desc",
                roleId: req.query.roleId as string,
                companyId: req.query.companyId as string,
                departmentId: req.query.departmentId as string,
                countryId: req.query.countryId as string,
                isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
            };

            const actorUser = await UserService.getById(requestingUser.id, requestingUser.companyId);
            if (!actorUser) {
                res.json(softError("Unauthorized"));
                return;
            }

            const actor = actorUser as IUser;

            const searchAccessQuery = buildUserSearchAccessQuery(actor);
            if (searchAccessQuery === null) {
                res.json(
                    success({ users: [], total: 0, page: params.page || 1, limit: params.limit || 10, totalPages: 0 }),
                );
                return;
            }

            const users = await UserService.getUsers(params, requestingUser.companyId, searchAccessQuery);
            res.json(success(users));
        } catch (error: any) {
            console.log("Error in UserController.getUsers:", error, { decoded: req.decoded, query: req.query });
            res.json(softError(error.message, error));
            next(error);
        }
    }

    static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const params: Partial<IUser> = { isActive: true };

            const USER_CREATE_REQUIRED_FIELDS: UserFieldMap = {
                name: { type: "string", targetField: "name", required: true },
                email: { type: "string", targetField: "email", required: true, isEmail: true },
                password: { type: "string", targetField: "password", required: true, minLength: 6, toBeHashed: true },
                role: { type: "string", targetField: "role", isPointer: true, pointerClass: "Roles", required: true },
                companyId: {
                    type: "string",
                    targetField: "company",
                    isPointer: true,
                    pointerClass: "Companies",
                    required: true,
                },
            };

            setMappedFields(params, USER_CREATE_REQUIRED_FIELDS, req.body as Record<string, unknown>);

            const USER_OPTIONAL_FIELDS: UserFieldMap = {
                departmentId: {
                    type: "string",
                    targetField: "department",
                    isPointer: true,
                    pointerClass: "Departments",
                    allowUnset: true,
                },
                countryId: {
                    type: "string",
                    targetField: "country",
                    isPointer: true,
                    pointerClass: "Countries",
                    allowUnset: true,
                },
                employmentTitleId: {
                    type: "string",
                    targetField: "employmentTitle",
                    isPointer: true,
                    pointerClass: "EmploymentTitles",
                    allowUnset: true,
                },
                managerId: {
                    type: "string",
                    targetField: "manager",
                    isPointer: true,
                    pointerClass: "Users",
                    allowUnset: true,
                },
            };

            setMappedFields(params, USER_OPTIONAL_FIELDS, req.body as Record<string, unknown>);

            const newUser = await UserService.create(params as Omit<IUser, "_id">, requestingUser.companyId);
            res.json(success({ user: newUser }));
        } catch (error: any) {
            console.log("Error in UserController.create:", error, { decoded: req.decoded, body: req.body });
            res.json(softError(error.message, error));
        }
    }

    static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const userId = req.params.id;
            const selectFields = req.query.fields ? (req.query.fields as string).split(",") : undefined;
            const user = await UserService.getById(userId, requestingUser.companyId, selectFields);
            if (!user) {
                res.json(softError("User not found"));
                return;
            }
            res.json(success(user));
        } catch (error: any) {
            console.log("Error in UserController.getById:", error);
            res.json(softError(error.message, error));
        }
    }

    static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            if (!requestingUser.id) {
                res.json(softError("Unauthorized"));
                return;
            }

            const userId = req.params.id;

            const actorUser = await UserService.getById(requestingUser.id, requestingUser.companyId);
            if (!actorUser) {
                res.json(softError("Unauthorized"));
                return;
            }

            const user = await UserService.getById(userId, requestingUser.companyId);
            if (!user) {
                res.json(softError("User not found"));
                return;
            }

            if (!canManageUser(actorUser as IUser, user as IUser)) {
                res.json(softError("Insufficient permissions to update this user"));
                return;
            }

            const actorRole = (actorUser as IUser & { role?: { role?: string } }).role;
            const actorRoleKey = typeof actorRole === "object" && actorRole ? actorRole.role : undefined;

            if ("companyId" in req.body && req.body.companyId !== undefined && actorRoleKey !== DefaultUserRoles.GOD) {
                res.json(softError("Only god role can change companyId"));
                return;
            }

            const sanitizedData: Partial<IUser> = {};

            const USER_UPDATE_FIELDS: UserFieldMap = {
                name: { type: "string", targetField: "name" },
                email: { type: "string", targetField: "email", isEmail: true },
                role: { type: "string", targetField: "role", isPointer: true, pointerClass: "Roles" },
                companyId: {
                    type: "string",
                    targetField: "company",
                    isPointer: true,
                    pointerClass: "Companies",
                    allowUnset: true,
                },
                departmentId: {
                    type: "string",
                    targetField: "department",
                    isPointer: true,
                    pointerClass: "Departments",
                    allowUnset: true,
                },
                countryId: {
                    type: "string",
                    targetField: "country",
                    isPointer: true,
                    pointerClass: "Countries",
                    allowUnset: true,
                },
                employmentTitleId: {
                    type: "string",
                    targetField: "employmentTitle",
                    isPointer: true,
                    pointerClass: "EmploymentTitles",
                    allowUnset: true,
                },
                managerId: {
                    type: "string",
                    targetField: "manager",
                    isPointer: true,
                    pointerClass: "Users",
                    allowUnset: true,
                },
                isActive: { type: "boolean", targetField: "isActive" },
            };

            setMappedFields(sanitizedData, USER_UPDATE_FIELDS, req.body as Record<string, unknown>);

            const updatedUser = await UserService.update(userId, sanitizedData, requestingUser.companyId);
            if (!updatedUser) {
                res.json(softError("User not found"));
                return;
            }
            res.json(success({ user: updatedUser }));
        } catch (error: any) {
            console.log("Error in UserController.update:", error);
            res.json(softError(error.message, error));
        }
    }

    static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const userId = req.params.id;
            const { currentPassword, newPassword } = req.body as {
                currentPassword?: string;
                newPassword?: string;
            };

            if (requestingUser.id !== userId) {
                res.json(softError("You can only change your own password"));
                return;
            }

            if (!currentPassword || !newPassword) {
                res.json(softError("Current password and new password are required"));
                return;
            }

            if (newPassword.length < 6) {
                res.json(softError("New password must be at least 6 characters"));
                return;
            }

            await UserService.changePassword(userId, currentPassword, newPassword, requestingUser.companyId);
            res.json(success({}));
        } catch (error: any) {
            console.log("Error in UserController.changePassword:", error);
            res.json(softError(error.message, error));
        }
    }

    static async grantPermission(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const userId = req.params.id;
            const permissionKey = String(req.body.permissionKey || "").trim();

            if (!permissionKey) {
                res.json(softError("permissionKey is required"));
                return;
            }

            if (!isValidPermissionKey(permissionKey)) {
                res.json(softError("Invalid permission key"));
                return;
            }

            const targetUser = await UserService.getById(userId, requestingUser.companyId, ["_id"]);
            if (!targetUser) {
                res.json(softError("User not found"));
                return;
            }

            await UserService.grantPermission(userId, permissionKey, requestingUser.companyId);
            res.json(success({ userId, permissionKey }));
        } catch (error: any) {
            console.log("Error in UserController.grantPermission:", error);
            res.json(softError(error.message, error));
        }
    }

    static async revokePermission(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const userId = req.params.id;
            const permissionKey = String(req.body.permissionKey || "").trim();

            if (!permissionKey) {
                res.json(softError("permissionKey is required"));
                return;
            }

            if (!isValidPermissionKey(permissionKey)) {
                res.json(softError("Invalid permission key"));
                return;
            }

            const targetUser = await UserService.getById(userId, requestingUser.companyId, ["_id"]);
            if (!targetUser) {
                res.json(softError("User not found"));
                return;
            }

            await UserService.revokePermission(userId, permissionKey, requestingUser.companyId);
            res.json(success({ userId, permissionKey }));
        } catch (error: any) {
            console.log("Error in UserController.revokePermission:", error);
            res.json(softError(error.message, error));
        }
    }

    static async uploadProfileImage(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const userId = req.params.id;

            if (requestingUser.id !== userId) {
                res.json(softError("You can only upload your own profile image"));
                return;
            }

            if (!req.file) {
                res.json(softError("Image file is required"));
                return;
            }

            const user = await UserService.getProfileImageMetadata(userId, requestingUser.companyId);
            if (!user) {
                res.json(softError("User not found"));
                return;
            }

            const oldPath = (user as IUser).profileImage?.path;

            const uploadResult = await StorageService.uploadUserProfileImage({
                companyId: requestingUser.companyId,
                userId,
                fileBuffer: req.file.buffer,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
            });

            const profileImage = {
                bucket: uploadResult.bucket,
                path: uploadResult.path,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                uploadedAt: new Date(),
            };

            const updatedUser = await UserService.updateProfileImageMetadata(
                userId,
                profileImage,
                requestingUser.companyId,
            );

            if (oldPath) {
                try {
                    await StorageService.removeFile(oldPath);
                } catch (deleteError) {
                    console.warn("Failed to remove old profile image", deleteError);
                }
            }

            res.json(success({ user: updatedUser }));
        } catch (error: any) {
            console.log("Error in UserController.uploadProfileImage:", error);
            res.json(softError(error.message, error));
        }
    }

    static async getProfileImageUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const userId = req.params.id;

            if (requestingUser.id !== userId) {
                res.json(softError("You can only access your own profile image"));
                return;
            }

            const user = await UserService.getProfileImageMetadata(userId, requestingUser.companyId);
            if (!user) {
                res.json(softError("User not found"));
                return;
            }

            const imagePath = (user as IUser).profileImage?.path;
            if (!imagePath) {
                res.json(softError("Profile image not found"));
                return;
            }

            const signed = await StorageService.createSignedUrl(imagePath);
            res.json(success({ ...signed }));
        } catch (error: any) {
            console.log("Error in UserController.getProfileImageUrl:", error);
            res.json(softError(error.message, error));
        }
    }

    static async deleteProfileImage(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const requestingUser = req.decoded as tokenPayload;
            const userId = req.params.id;

            if (requestingUser.id !== userId) {
                res.json(softError("You can only delete your own profile image"));
                return;
            }

            const user = await UserService.getProfileImageMetadata(userId, requestingUser.companyId);
            if (!user) {
                res.json(softError("User not found"));
                return;
            }

            const imagePath = (user as IUser).profileImage?.path;
            if (!imagePath) {
                res.json(success({}));
                return;
            }

            await StorageService.removeFile(imagePath);
            await UserService.updateProfileImageMetadata(userId, undefined, requestingUser.companyId);

            res.json(success({}));
        } catch (error: any) {
            console.log("Error in UserController.deleteProfileImage:", error);
            res.json(softError(error.message, error));
        }
    }
}
