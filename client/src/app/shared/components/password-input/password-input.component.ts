import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, signal } from "@angular/core";
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
})
export class PasswordInputComponent {
    controlName = input.required<string>();
    label = input("Password");
    placeholder = input("");
    autocomplete = input("current-password");
    requiredMessage = input("Password is required");
    minlengthMessage = input("Password must be at least 6 characters");
    mismatchVisible = input(false);
    mismatchMessage = input("Passwords do not match");

    hidden = signal(true);

    constructor(private formGroupDirective: FormGroupDirective) {}

    get control(): FormControl | null {
        const formControl = this.formGroupDirective.control.get(this.controlName());
        return formControl instanceof FormControl ? formControl : null;
    }
}
