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
                loadComponent: () => import("./features/dashboard/dashboard.component").then(m => m.DashboardComponent),
            },
            {
                path: "users",
                children: [
                    {
                        path: "",
                        loadComponent: () => import("./features/users/users.component").then(m => m.UsersComponent),
                    },
                    {
                        path: "create",
                        canActivate: [createUserGuard],
                        loadComponent: () =>
                            import("./features/users/create-user/create-user.component").then(
                                m => m.CreateUserPageComponent,
                            ),
                    },
                    {
                        path: ":id/edit",
                        canActivate: [editUserGuard],
                        loadComponent: () =>
                            import("./features/users/edit-user/edit-user.component").then(m => m.EditUserPageComponent),
                    },
                ],
            },
            {
                path: "roles",
                loadComponent: () => import("./features/roles/roles.component").then(m => m.RolesComponent),
            },
            {
                path: "departments",
                loadComponent: () =>
                    import("./features/departments/departments.component").then(m => m.DepartmentsComponent),
            },
            {
                path: "countries",
                loadComponent: () => import("./features/countries/countries.component").then(m => m.CountriesComponent),
            },
            {
                path: "sub-departments",
                loadComponent: () =>
                    import("./features/sub-departments/sub-departments.component").then(m => m.SubDepartmentsComponent),
            },
            {
                path: "employment-titles",
                loadComponent: () =>
                    import("./features/employment-titles/employment-titles.component").then(
                        m => m.EmploymentTitlesComponent,
                    ),
            },
            {
                path: "permissions",
                loadComponent: () =>
                    import("./features/permissions/permissions.component").then(m => m.PermissionsComponent),
            },
            {
                path: "profile",
                children: [
                    {
                        path: "me",
                        resolve: { profileContext: profileRouteContextResolver },
                        loadComponent: () =>
                            import("./features/profile/profile.component").then(m => m.ProfileComponent),
                    },
                    {
                        path: ":id",
                        resolve: { profileContext: profileRouteContextResolver },
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
