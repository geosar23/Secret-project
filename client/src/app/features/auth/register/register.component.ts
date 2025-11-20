import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";

@Component({
    selector: "app-register",
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: "./register.component.html",
    styleUrl: "./register.component.scss",
})
export class RegisterComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    registerForm = this.fb.group({
        name: ["", [Validators.required, Validators.minLength(2)]],
        email: ["", [Validators.required, Validators.email]],
        password: ["", [Validators.required, Validators.minLength(6)]],
        confirmPassword: ["", [Validators.required]],
    });

    isLoading = false;
    errorMessage = "";

    onSubmit(): void {
        if (this.registerForm.invalid) {
            Object.keys(this.registerForm.controls).forEach(key => {
                this.registerForm.get(key)?.markAsTouched();
            });
            return;
        }

        const { name, email, password, confirmPassword } = this.registerForm.value;

        // Check if passwords match
        if (password !== confirmPassword) {
            this.errorMessage = "Passwords do not match";
            return;
        }

        this.isLoading = true;
        this.errorMessage = "";

        this.authService.register({ name: name!, email: email!, password: password! }).subscribe({
            next: () => {
                this.router.navigate(["/dashboard"]);
            },
            error: error => {
                this.isLoading = false;
                this.errorMessage =
                    error.error?.message || "Registration failed. Please try again.";
            },
        });
    }

    getErrorMessage(fieldName: string): string {
        const field = this.registerForm.get(fieldName);
        if (field?.hasError("required")) {
            return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        }
        if (field?.hasError("email")) {
            return "Please enter a valid email address";
        }
        if (field?.hasError("minlength")) {
            const minLength = field.errors?.["minlength"]?.requiredLength;
            return `Minimum ${minLength} characters required`;
        }
        return "";
    }
}
