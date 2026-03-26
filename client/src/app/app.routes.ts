import { Routes } from "@angular/router";
import { LoginComponent } from "./features/auth/login/login.component";
import { authGuard } from "./core/guards/auth.guard";
import { MainLayoutComponent } from "./shared/layouts/main-layout/main-layout.component";
import { profileRouteContextResolver } from "./features/profile/profile-route-context.resolver";

export const routes: Routes = [
    { path: "", redirectTo: "/dashboard", pathMatch: "full" },
    { path: "login", component: LoginComponent },
    {
        path: "",
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: "dashboard",
                loadComponent: () => import("./features/dashboard/dashboard.component").then(m => m.DashboardComponent),
            },
            {
                path: "users",
                loadComponent: () => import("./features/users/users.component").then(m => m.UsersComponent),
            },
            {
                path: "companies",
                loadComponent: () => import("./features/companies/companies.component").then(m => m.CompaniesComponent),
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
    { path: "**", redirectTo: "/dashboard" },
];
