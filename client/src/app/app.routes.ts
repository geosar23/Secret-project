import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { areaGuard, areaWriteGuard } from "./core/guards/area.guard";
import { createUserGuard } from "./core/guards/create-user.guard";
import { editUserGuard } from "./core/guards/edit-user.guard";
import { profileRouteContextResolver } from "./features/profile/profile-route-context.resolver";
import { editUserContextResolver } from "./features/users/edit-user/edit-user-context.resolver";

export const routes: Routes = [
    { path: "", redirectTo: "/dashboard", pathMatch: "full" },
    {
        path: "login",
        loadComponent: () => import("./features/auth/login/login.component").then(m => m.LoginComponent),
    },
    {
        path: "forgot-password",
        loadComponent: () =>
            import("./features/auth/forgot-password/forgot-password.component").then(m => m.ForgotPasswordComponent),
    },
    {
        path: "password-setup",
        loadComponent: () =>
            import("./features/auth/password-setup/password-setup.component").then(m => m.PasswordSetupComponent),
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
                path: "requests",
                data: { breadcrumb: "Requests" },
                loadComponent: () => import("./features/requests/requests.component").then(m => m.RequestsComponent),
            },
            {
                path: "org-chart",
                data: { breadcrumb: "Org Chart" },
                loadComponent: () => import("./features/org-chart/org-chart.component").then(m => m.OrgChartComponent),
            },
            {
                path: "non-authorized",
                data: { breadcrumb: "Not Authorized" },
                loadComponent: () => import("./features/notFound/notFound.component").then(m => m.NotFoundComponent),
            },
            {
                path: "users",
                data: { breadcrumb: "Users" },
                children: [
                    {
                        path: "",
                        canActivate: [areaGuard("users")],
                        loadComponent: () => import("./features/users/users.component").then(m => m.UsersComponent),
                    },
                    {
                        path: "create",
                        canActivate: [createUserGuard],
                        data: { breadcrumb: "Create User", originAware: true },
                        loadComponent: () =>
                            import("./features/users/create-user/create-user.component").then(
                                m => m.CreateUserPageComponent,
                            ),
                    },
                    {
                        path: ":id/edit",
                        canActivate: [editUserGuard],
                        resolve: { editContext: editUserContextResolver },
                        data: { breadcrumb: "Edit User", originAware: true },
                        loadComponent: () =>
                            import("./features/users/edit-user/edit-user.component").then(m => m.EditUserPageComponent),
                    },
                ],
            },
            {
                path: "roles",
                data: { breadcrumb: "Roles" },
                children: [
                    {
                        path: "",
                        canActivate: [areaGuard("roles")],
                        loadComponent: () => import("./features/roles/roles.component").then(m => m.RolesComponent),
                    },
                    {
                        path: "create",
                        canActivate: [areaWriteGuard("roles")],
                        data: { breadcrumb: "Create Role", originAware: true },
                        loadComponent: () =>
                            import("./features/roles/role-editor/role-editor.component").then(
                                m => m.RoleEditorPageComponent,
                            ),
                    },
                    {
                        path: ":id/edit",
                        canActivate: [areaWriteGuard("roles")],
                        data: { breadcrumb: "Edit Role", originAware: true },
                        loadComponent: () =>
                            import("./features/roles/role-editor/role-editor.component").then(
                                m => m.RoleEditorPageComponent,
                            ),
                    },
                ],
            },
            {
                path: "departments",
                canActivate: [areaGuard("departments")],
                data: { breadcrumb: "Departments" },
                loadComponent: () =>
                    import("./features/departments/departments.component").then(m => m.DepartmentsComponent),
            },
            {
                path: "countries",
                canActivate: [areaGuard("countries")],
                data: { breadcrumb: "Countries" },
                loadComponent: () => import("./features/countries/countries.component").then(m => m.CountriesComponent),
            },
            {
                path: "sub-departments",
                canActivate: [areaGuard("subDepartments")],
                data: { breadcrumb: "Sub-Departments" },
                loadComponent: () =>
                    import("./features/sub-departments/sub-departments.component").then(m => m.SubDepartmentsComponent),
            },
            {
                path: "employment-titles",
                canActivate: [areaGuard("employmentTitles")],
                data: { breadcrumb: "Employment Titles" },
                loadComponent: () =>
                    import("./features/employment-titles/employment-titles.component").then(
                        m => m.EmploymentTitlesComponent,
                    ),
            },
            {
                path: "levels",
                canActivate: [areaGuard("levels")],
                data: { breadcrumb: "Levels" },
                loadComponent: () => import("./features/levels/levels.component").then(m => m.LevelsComponent),
            },
            {
                path: "offices",
                canActivate: [areaGuard("offices")],
                data: { breadcrumb: "Offices" },
                loadComponent: () => import("./features/offices/offices.component").then(m => m.OfficesComponent),
            },
            {
                path: "permissions",
                canActivate: [areaGuard("roles")],
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
                        data: { breadcrumb: "My Profile", originAware: true },
                        loadComponent: () =>
                            import("./features/profile/profile.component").then(m => m.ProfileComponent),
                    },
                    {
                        path: ":id",
                        resolve: { profileContext: profileRouteContextResolver },
                        data: { breadcrumb: "Profile", originAware: true },
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
