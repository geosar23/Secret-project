import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
import { UsersService } from "../../../core/services/users.service";
import { passwordMatchValidator } from "../../../core/validators/generic.validators";
import { decodeToken } from "../../../core/utils/token.util";
import { LoadingButtonComponent } from "../../../shared/components/loading-button/loading-button.component";
import { PasswordInputComponent } from "../../../shared/components/password-input/password-input.component";

/**
 * - link:   arrived from an emailed link (forgot password, later the invitation); the token is in the URL.
 * - forced: signed in with an admin-issued temporary password; proves it as the current password.
 * - dead:   nothing to redeem, or the server refused the token (expired, used, invalid).
 */
type SetupMode = "link" | "forced" | "dead";

const INVALID_LINK = "This link is not valid. Request a new one.";

@Component({
    selector: "app-password-setup",
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        LoadingButtonComponent,
        PasswordInputComponent,
    ],
    templateUrl: "./password-setup.component.html",
    styleUrl: "./password-setup.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordSetupComponent {
    private fb = inject(FormBuilder);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private authService = inject(AuthService);
    private usersService = inject(UsersService);
    private toast = inject(ToastService);

    /** Kept in memory only; the URL is cleaned right away so it does not stay in the address bar or history. */
    private token: string | null = null;

    mode = signal<SetupMode>("dead");
    deadMessage = signal(INVALID_LINK);
    errorMessage = signal("");
    loading = signal(false);

    form: FormGroup = this.fb.group(
        {
            newPassword: ["", [Validators.required, Validators.minLength(6)]],
            confirmPassword: ["", [Validators.required]],
        },
        { validators: passwordMatchValidator },
    );

    constructor() {
        const token = this.route.snapshot.queryParamMap.get("token");
        if (token) {
            this.token = token;
            this.mode.set("link");
            void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        } else if (this.authService.isAuthenticated()) {
            this.mode.set("forced");
            this.form.addControl("currentPassword", new FormControl("", [Validators.required]));
        }
    }

    hasPasswordMismatch(): boolean {
        const confirmPassword = this.form.get("confirmPassword");
        return !!confirmPassword?.touched && !!confirmPassword?.hasError("passwordMismatch");
    }

    submit(): void {
        if (this.form.invalid || this.loading()) {
            this.form.markAllAsTouched();
            return;
        }

        this.errorMessage.set("");
        this.loading.set(true);
        if (this.mode() === "forced") {
            this.changeTemporaryPassword();
        } else {
            this.redeemLink();
        }
    }

    private redeemLink(): void {
        const newPassword = this.form.value.newPassword as string;
        this.authService.setupPassword(this.token as string, newPassword).subscribe({
            next: response => {
                this.loading.set(false);
                if (response.success) {
                    this.token = null;
                    this.toast.success("Password updated. Sign in with your new password.");
                    void this.router.navigate(["/login"]);
                    return;
                }
                const message = response.message || INVALID_LINK;
                if (response.error?.code === "weak_password") {
                    this.errorMessage.set(message); // the link is still good; let them pick another password
                    return;
                }
                this.token = null;
                this.deadMessage.set(message);
                this.mode.set("dead");
            },
            error: error => {
                this.loading.set(false);
                this.errorMessage.set(error.error?.message || "Something went wrong. Please try again.");
            },
        });
    }

    private changeTemporaryPassword(): void {
        const userId = decodeToken(this.authService.getToken() ?? "")?.id;
        if (!userId) {
            this.loading.set(false);
            this.authService.logout();
            return;
        }

        const { currentPassword, newPassword } = this.form.value as { currentPassword: string; newPassword: string };
        this.usersService.changePassword(userId, { currentPassword, newPassword }).subscribe({
            next: response => {
                this.loading.set(false);
                if (!response.success) {
                    this.errorMessage.set(response.message || "Failed to change password");
                    return;
                }
                this.toast.success("Password changed. Sign in with your new password.");
                this.authService.logout(); // changing the password revokes every JWT, including the current one
            },
            error: error => {
                this.loading.set(false);
                this.errorMessage.set(error.error?.message || "Failed to change password");
            },
        });
    }
}
