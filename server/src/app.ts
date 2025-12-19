import express from "express";
import cors from "cors";
import apiRouter from "./api/routes";
import errorMiddleware from "./middleware/error.middleware";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PermissionService } from "./services/permission.service";
import { PermissionActions, PermissionCategories, PermissionScopes } from "./enums/permissions.enum";
import { IPermission } from "./interfaces/permission.interface";

// import swaggerUi from "swagger-ui-express"; //check later
// import swaggerDocument from "./swagger.json";

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per 15 minutes
});

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true })); // Enable CORS
app.use(express.json()); // parses incoming JSON requests
app.use(morgan("dev")); // HTTP request logger
app.use(helmet()); // sets secure HTTP headers
app.use(limiter);
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // Swagger API docs

// Global API routes (composed)
app.use("/api", apiRouter);

// Global error handler
app.use(errorMiddleware);

// Script to run at startup
// scriptToRunAtStartup();

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
async function scriptToRunAtStartup() {
    //Populate permissions collection
    //Add view permissions for user profile
    const newPermissions: Partial<IPermission>[] = [
        {
            key: "userProfile:read:*",
            description: "Allows user to read user profiles with all scope",
            name: "Read All User Profiles",
            category: PermissionCategories.USER_PROFILE,
            scope: PermissionScopes.ALL,
            action: PermissionActions.READ,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            key: "userProfile:read:company",
            description: "Allows user to read user profiles within their company",
            name: "Read Company User Profiles",
            category: PermissionCategories.USER_PROFILE,
            scope: PermissionScopes.COMPANY,
            action: PermissionActions.READ,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            key: "userProfile:read:department",
            description: "Allows user to read user profiles within their department",
            name: "Read Department User Profiles",
            category: PermissionCategories.USER_PROFILE,
            scope: PermissionScopes.DEPARTMENT,
            action: PermissionActions.READ,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            key: "userProfile:read:country",
            description: "Allows user to read user profiles within their country",
            name: "Read Country User Profiles",
            category: PermissionCategories.USER_PROFILE,
            scope: PermissionScopes.COUNTRY,
            action: PermissionActions.READ,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            key: "userProfile:read:department-country",
            description: "Allows user to read user profiles within their department and country",
            name: "Read Department & Country Users",
            category: PermissionCategories.USERS_MANAGEMENT,
            scope: PermissionScopes.DEPARTMENT_COUNTRY,
            action: PermissionActions.READ,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            key: "userProfile:read:managed",
            description: "Allows user to read user profiles they manage",
            name: "Read Managed Users",
            category: PermissionCategories.USERS_MANAGEMENT,
            scope: PermissionScopes.MANAGED,
            action: PermissionActions.READ,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    newPermissions.forEach(async perm => {
        try {
            await PermissionService.create(perm);
        } catch (error) {
            if (error instanceof Error) {
                console.log(error.message, `Permission ${perm.key} may already exist. Skipping creation.`);
            } else {
                console.log(`Permission ${perm.key} may already exist. Skipping creation.`);
            }
        }
    });
}

export default app;
