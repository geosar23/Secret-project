import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { AuthService } from "../../../core/services/auth.service";
import { LoadingButtonComponent } from "../../../shared/components/loading-button/loading-button.component";

@Component({
    selector: "app-forgot-password",
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        LoadingButtonComponent,
    ],
    templateUrl: "./forgot-password.component.html",
    styleUrl: "./forgot-password.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);

    form = this.fb.nonNullable.group({
        email: ["", [Validators.required, Validators.email]],
    });
    loading = signal(false);
    /** The same confirmation is shown whatever the server knows about the address. */
    submitted = signal(false);

    get email() {
        return this.form.controls.email;
    }

    submit(): void {
        if (this.form.invalid || this.loading()) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        this.authService.forgotPassword(this.form.controls.email.value.trim()).subscribe({
            next: () => {
                this.loading.set(false);
                this.submitted.set(true);
            },
            // Network, rate limit and server problems are toasted by the error interceptor; the form stays for a retry.
            error: () => this.loading.set(false),
        });
    }
}
