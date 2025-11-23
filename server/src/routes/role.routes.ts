import { Router } from "express";
import { RoleController } from "../controllers/role.controller";

const router = Router();

// Get role hierarchy
router.get("/hierarchy", RoleController.getRoleHierarchy);

// Get permissions for a specific role type
router.get("/:roleType/permissions", RoleController.getRolePermissions);

// Get all roles
router.get("/", RoleController.getAllRoles);

// Get role by ID
router.get("/:id", RoleController.getRoleById);

// Create custom role
router.post("/", RoleController.createRole);

// Update custom role
router.put("/:id", RoleController.updateRole);

// Delete custom role
router.delete("/:id", RoleController.deleteRole);

export default router;
