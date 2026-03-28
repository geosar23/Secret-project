import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { ControlContainer, FormControl, FormGroupDirective, ReactiveFormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";

@Component({
    selector: "app-password-input",
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
    templateUrl: "./password-input.component.html",
    styleUrls: ["./password-input.component.scss"],
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
})
export class PasswordInputComponent {
    @Input({ required: true }) controlName = "password";
    @Input() label = "Password";
    @Input() placeholder = "";
    @Input() autocomplete = "current-password";
    @Input() requiredMessage = "Password is required";
    @Input() minlengthMessage = "Password must be at least 6 characters";
    @Input() mismatchVisible = false;
    @Input() mismatchMessage = "Passwords do not match";

    hidden = true;

    constructor(private formGroupDirective: FormGroupDirective) {}

    get control(): FormControl | null {
        const formControl = this.formGroupDirective.control.get(this.controlName);
        return formControl instanceof FormControl ? formControl : null;
    }
}
