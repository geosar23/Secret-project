import { AbstractControl, ValidationErrors } from "@angular/forms";

export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get("newPassword")?.value;
    const confirmPasswordControl = control.get("confirmPassword");
    const confirmPassword = confirmPasswordControl?.value;

    if (!confirmPasswordControl) {
        return null;
    }

    const hasMismatch = !!newPassword && !!confirmPassword && newPassword !== confirmPassword;
    const currentErrors = confirmPasswordControl.errors ?? {};

    if (hasMismatch) {
        if (!currentErrors["passwordMismatch"]) {
            confirmPasswordControl.setErrors({ ...currentErrors, passwordMismatch: true });
        }
        return { passwordMismatch: true };
    }

    if (currentErrors["passwordMismatch"]) {
        const remainingErrors = { ...currentErrors };
        delete remainingErrors["passwordMismatch"];
        confirmPasswordControl.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
    }

    return null;
}
