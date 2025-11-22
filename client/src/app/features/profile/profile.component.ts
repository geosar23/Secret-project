import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatDividerModule } from "@angular/material/divider";
import { ProfileService } from "../../core/services/profile.service";
import { AuthService } from "../../core/services/auth.service";
import { UserProfile } from "../../core/interfaces/profile.interface";

@Component({
    selector: "app-profile",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
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
export class ProfileComponent implements OnInit {
    private fb = inject(FormBuilder);
    private profileService = inject(ProfileService);
    private authService = inject(AuthService);

    profile: UserProfile | null = null;
    profileForm: FormGroup;
    passwordForm: FormGroup;
    loading = false;
    profileError = "";
    profileSuccess = "";
    passwordError = "";
    passwordSuccess = "";
    editMode = false;

    constructor() {
        this.profileForm = this.fb.group({
            name: ["", [Validators.required, Validators.minLength(2)]],
            email: ["", [Validators.required, Validators.email]],
        });

        this.passwordForm = this.fb.group({
            currentPassword: ["", [Validators.required]],
            newPassword: ["", [Validators.required, Validators.minLength(6)]],
            confirmPassword: ["", [Validators.required]],
        });
    }

    ngOnInit(): void {
        this.loadProfile();
    }

    loadProfile(): void {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser || !currentUser.id) return;

        this.loading = true;
        this.profileError = "";

        this.profileService.getProfile(currentUser.id).subscribe({
            next: response => {
                this.profile = response.user;
                this.profileForm.patchValue({
                    name: this.profile.name,
                    email: this.profile.email,
                });
                this.loading = false;
            },
            error: error => {
                this.profileError = error.error?.error || "Failed to load profile";
                this.loading = false;
            },
        });
    }

    toggleEditMode(): void {
        this.editMode = !this.editMode;
        if (!this.editMode) {
            // Reset form to original values
            this.profileForm.patchValue({
                name: this.profile?.name,
                email: this.profile?.email,
            });
        }
        this.profileSuccess = "";
        this.profileError = "";
    }

    onUpdateProfile(): void {
        if (this.profileForm.invalid || !this.profile) return;

        this.loading = true;
        this.profileError = "";
        this.profileSuccess = "";

        this.profileService.updateProfile(this.profile.id, this.profileForm.value).subscribe({
            next: response => {
                this.profile = response.user;
                this.profileSuccess = "Profile updated successfully";
                this.editMode = false;
                this.loading = false;
            },
            error: error => {
                this.profileError = error.error?.error || "Failed to update profile";
                this.loading = false;
            },
        });
    }

    onChangePassword(): void {
        if (this.passwordForm.invalid || !this.profile) return;

        const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

        if (newPassword !== confirmPassword) {
            this.passwordError = "New passwords do not match";
            return;
        }

        this.loading = true;
        this.passwordError = "";
        this.passwordSuccess = "";

        this.profileService
            .changePassword(this.profile.id, { currentPassword, newPassword })
            .subscribe({
                next: () => {
                    this.passwordSuccess = "Password changed successfully";
                    this.passwordForm.reset();
                    this.loading = false;
                },
                error: error => {
                    this.passwordError = error.error?.error || "Failed to change password";
                    this.loading = false;
                },
            });
    }

    getRoleColor(role: string): string {
        const colors: Record<string, string> = {
            GOD: "purple",
            SUPER_ADMIN: "red",
            ADMIN: "orange",
            HR: "blue",
            MANAGER: "green",
            EMPLOYEE: "gray",
        };
        return colors[role.toUpperCase()] || "gray";
    }
}
