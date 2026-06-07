import { ResolveFn } from "@angular/router";
import { ProfileRouteContext } from "../../core/interfaces/profile.interface";

export const profileRouteContextResolver: ResolveFn<ProfileRouteContext> = route => {
    const routeUserId = route.paramMap.get("id");
    const isOwnProfile = !routeUserId || routeUserId === "me";
    return {
        isOwnProfile,
        pageTitle: isOwnProfile ? "My Profile" : "User Profile",
        userId: isOwnProfile ? null : routeUserId,
    };
};
