import { Component, inject } from "@angular/core";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { AuthService } from "../../../core/services/auth.service";
import { ToastService } from "../../../core/services/toast.service";
import { PasswordInputComponent } from "../../../shared/components/password-input/password-input.component";

@Component({
    selector: "app-login",
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        PasswordInputComponent,
    ],
    templateUrl: "./login.component.html",
    styleUrl: "./login.component.scss",
})
export class LoginComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private toast = inject(ToastService);

    loginForm: FormGroup;
    loading = false;
    errorMessage = "";

    constructor() {
        this.loginForm = this.fb.group({
            email: ["", [Validators.required, Validators.email]],
            password: ["", [Validators.required, Validators.minLength(6)]],
        });
    }

    onSubmit(): void {
        if (this.loginForm.invalid) {
            return;
        }

        this.loading = true;
        this.errorMessage = "";

        this.authService.login(this.loginForm.value).subscribe({
            next: () => {
                this.router.navigate(["/dashboard"]);
            },
            error: error => {
                const errMsg = error.error?.message || "Login failed. Please try again.";
                this.errorMessage = errMsg;
                this.toast.error(errMsg);
                this.loading = false;
            },
            complete: () => {
                this.loading = false;
            },
        });
    }

    get email() {
        return this.loginForm.get("email");
    }
}
