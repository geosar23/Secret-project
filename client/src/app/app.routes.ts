import { Routes } from "@angular/router";
import { LoginComponent } from "./features/auth/login/login.component";
import { RegisterComponent } from "./features/auth/register/register.component";
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { authGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
    { path: "", redirectTo: "/dashboard", pathMatch: "full" },
    { path: "login", component: LoginComponent },
    { path: "register", component: RegisterComponent },
    { path: "dashboard", component: DashboardComponent, canActivate: [authGuard] },
    {
        path: "permissions",
        loadComponent: () =>
            import("./features/permissions/permissions.component").then(m => m.PermissionsComponent),
        canActivate: [authGuard],
    },
    {
        path: "profile",
        loadComponent: () => import("./features/profile/profile.component").then(m => m.ProfileComponent),
        canActivate: [authGuard],
    },
    { path: "**", redirectTo: "/dashboard" },
];
