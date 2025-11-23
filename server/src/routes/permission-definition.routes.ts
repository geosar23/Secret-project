import { Router } from "express";
import { PermissionDefinitionController } from "../controllers/permission-definition.controller";

const router = Router();

// Get permission categories
router.get("/categories", PermissionDefinitionController.getPermissionCategories);

// Get permissions grouped by category
router.get("/grouped", PermissionDefinitionController.getPermissionsGrouped);

// Search permissions
router.get("/search", PermissionDefinitionController.searchPermissions);

// Get permissions by category
router.get("/category/:category", PermissionDefinitionController.getPermissionsByCategory);

// Get permissions by entity
router.get("/entity/:entity", PermissionDefinitionController.getPermissionsByEntity);

// Get all permissions
router.get("/", PermissionDefinitionController.getAllPermissions);

// Get permission by ID
router.get("/:id", PermissionDefinitionController.getPermissionById);

export default router;
