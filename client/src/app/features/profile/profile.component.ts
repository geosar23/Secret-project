import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatDividerModule } from "@angular/material/divider";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { UserProfile, ProfileRouteContext, ChangePasswordDialogResult } from "../../core/interfaces/profile.interface";
import { RoleUtils } from "../../core/utils/role.utils";
import { UsersService } from "../../core/services/users.service";
import { ToastService } from "../../core/services/toast.service";
import { Subject } from "rxjs";
import { skipWhile, takeUntil } from "rxjs/operators";
import { ChangePasswordDialogComponent } from "./change-password-dialog/change-password-dialog.component";
import { EditUserDialogComponent, EditUserDialogData } from "../users/edit-user-dialog/edit-user-dialog.component";
@Component({
    selector: "app-profile",
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatIconModule,
        MatChipsModule,
        MatDividerModule,
    ],
    templateUrl: "./profile.component.html",
    styleUrls: ["./profile.component.scss"],
})
export class ProfileComponent implements OnInit, OnDestroy {
    private usersService = inject(UsersService);
    private authService = inject(AuthService);
    private route = inject(ActivatedRoute);
    private dialog = inject(MatDialog);
    private toast = inject(ToastService);

    private destroy$ = new Subject<void>();

    profile: UserProfile | null = null;
    loading = false;
    isOwnProfile = true;
    pageTitle = "My Profile";

    ngOnInit(): void {
        this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
            const profileContext = data["profileContext"] as ProfileRouteContext;

            this.isOwnProfile = profileContext.isOwnProfile;
            this.pageTitle = profileContext.pageTitle;

            if (profileContext.isOwnProfile) {
                this.loadOwnProfile();
                return;
            }

            if (!profileContext.userId) {
                this.toast.error("User profile route is missing user id");
                return;
            }

            this.loadUserProfile(profileContext.userId);
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadOwnProfile(): void {
        this.loading = true;

        this.authService.localUser$
            .pipe(
                skipWhile(user => !user),
                takeUntil(this.destroy$),
            )
            .subscribe(user => {
                if (!user || !user._id) {
                    this.toast.error("Failed to load profile");
                    this.loading = false;
                    return;
                }

                this.profile = user;
                this.loading = false;
            });
    }

    loadUserProfile(userId: string): void {
        this.loading = true;

        this.usersService.getUserById(userId).subscribe({
            next: response => {
                if (!response.success || !response.data) {
                    this.toast.error(response.message || "User not found");
                    this.loading = false;
                    return;
                }
                this.profile = response.data;
                this.loading = false;
            },
            error: error => {
                this.toast.error(error.error?.error || "Failed to load user profile");
                this.loading = false;
            },
        });
    }

    openEditDialog(): void {
        if (!this.profile || this.loading) return;

        this.dialog
            .open(EditUserDialogComponent, {
                width: "500px",
                maxWidth: "95vw",
                data: { user: this.profile } as EditUserDialogData,
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe(updatedUser => {
                if (!updatedUser) return;
                this.profile = updatedUser;
                if (this.isOwnProfile) {
                    this.authService
                        .patchAndRefreshCurrentUser(updatedUser)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe({
                            next: user => {
                                this.profile = user;
                            },
                            error: () => {
                                return;
                            },
                        });
                }
                this.toast.success("Profile updated successfully");
            });
    }

    openChangePasswordDialog(): void {
        if (!this.profile || this.loading) return;

        this.dialog
            .open(ChangePasswordDialogComponent, {
                width: "460px",
                maxWidth: "95vw",
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((result?: ChangePasswordDialogResult) => {
                if (!result) return;
                this.onChangePassword(result);
            });
    }

    onChangePassword(payload: ChangePasswordDialogResult): void {
        if (!this.profile) return;

        this.loading = true;

        this.usersService.changePassword(this.profile._id as string, payload).subscribe({
            next: () => {
                this.toast.success("Password changed successfully");
                this.loading = false;
            },
            error: error => {
                this.toast.error(error.error?.error || "Failed to change password");
                this.loading = false;
            },
        });
    }

    getRoleColor(role: string): string {
        return RoleUtils.getRoleColor(role);
    }
}
