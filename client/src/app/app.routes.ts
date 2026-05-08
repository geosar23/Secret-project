import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { createUserGuard } from "./core/guards/create-user.guard";
import { editUserGuard } from "./core/guards/edit-user.guard";
import { profileRouteContextResolver } from "./features/profile/profile-route-context.resolver";

export const routes: Routes = [
    { path: "", redirectTo: "/dashboard", pathMatch: "full" },
    {
        path: "login",
        loadComponent: () => import("./features/auth/login/login.component").then(m => m.LoginComponent),
    },
    {
        path: "",
        loadComponent: () =>
            import("./shared/layouts/main-layout/main-layout.component").then(m => m.MainLayoutComponent),
        canActivate: [authGuard],
        children: [
            {
                path: "dashboard",
                data: { breadcrumb: "Dashboard" },
                loadComponent: () => import("./features/dashboard/dashboard.component").then(m => m.DashboardComponent),
            },
            {
                path: "users",
                data: { breadcrumb: "Users" },
                children: [
                    {
                        path: "",
                        loadComponent: () => import("./features/users/users.component").then(m => m.UsersComponent),
                    },
                    {
                        path: "create",
                        canActivate: [createUserGuard],
                        data: { breadcrumb: "Create User" },
                        loadComponent: () =>
                            import("./features/users/create-user/create-user.component").then(
                                m => m.CreateUserPageComponent,
                            ),
                    },
                    {
                        path: ":id/edit",
                        canActivate: [editUserGuard],
                        data: { breadcrumb: "Edit User" },
                        loadComponent: () =>
                            import("./features/users/edit-user/edit-user.component").then(m => m.EditUserPageComponent),
                    },
                ],
            },
            {
                path: "roles",
                data: { breadcrumb: "Roles" },
                loadComponent: () => import("./features/roles/roles.component").then(m => m.RolesComponent),
            },
            {
                path: "departments",
                data: { breadcrumb: "Departments" },
                loadComponent: () =>
                    import("./features/departments/departments.component").then(m => m.DepartmentsComponent),
            },
            {
                path: "countries",
                data: { breadcrumb: "Countries" },
                loadComponent: () => import("./features/countries/countries.component").then(m => m.CountriesComponent),
            },
            {
                path: "sub-departments",
                data: { breadcrumb: "Sub-Departments" },
                loadComponent: () =>
                    import("./features/sub-departments/sub-departments.component").then(m => m.SubDepartmentsComponent),
            },
            {
                path: "employment-titles",
                data: { breadcrumb: "Employment Titles" },
                loadComponent: () =>
                    import("./features/employment-titles/employment-titles.component").then(
                        m => m.EmploymentTitlesComponent,
                    ),
            },
            {
                path: "permissions",
                data: { breadcrumb: "Permissions" },
                loadComponent: () =>
                    import("./features/permissions/permissions.component").then(m => m.PermissionsComponent),
            },
            {
                path: "profile",
                children: [
                    {
                        path: "me",
                        resolve: { profileContext: profileRouteContextResolver },
                        data: { breadcrumb: "My Profile" },
                        loadComponent: () =>
                            import("./features/profile/profile.component").then(m => m.ProfileComponent),
                    },
                    {
                        path: ":id",
                        resolve: { profileContext: profileRouteContextResolver },
                        data: { breadcrumb: "Profile" },
                        loadComponent: () =>
                            import("./features/profile/profile.component").then(m => m.ProfileComponent),
                    },
                    {
                        path: "**",
                        redirectTo: "me",
                    },
                ],
            },
        ],
    },
    {
        path: "**",
        loadComponent: () => import("./features/notFound/notFound.component").then(m => m.NotFoundComponent),
    },
];
