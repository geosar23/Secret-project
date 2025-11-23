import { Routes } from "@angular/router";
import { LoginComponent } from "./features/auth/login/login.component";
import { authGuard } from "./core/guards/auth.guard";
import { MainLayoutComponent } from "./shared/layouts/main-layout/main-layout.component";

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
                path: "permissions",
                loadComponent: () =>
                    import("./features/permissions/permissions.component").then(m => m.PermissionsComponent),
            },
            {
                path: "profile",
                loadComponent: () => import("./features/profile/profile.component").then(m => m.ProfileComponent),
            },
        ],
    },
    { path: "**", redirectTo: "/dashboard" },
];
