import { Injectable, inject } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({ providedIn: "root" })
export class ToastService {
    private snackBar = inject(MatSnackBar);

    success(message: string, duration = 4000): void {
        this.snackBar.open(message, "✕", {
            duration,
            panelClass: ["toast-success"],
            horizontalPosition: "right",
            verticalPosition: "top",
        });
    }

    error(message: string, duration = 6000): void {
        this.snackBar.open(message, "✕", {
            duration,
            panelClass: ["toast-error"],
            horizontalPosition: "right",
            verticalPosition: "top",
        });
    }

    info(message: string, duration = 4000): void {
        this.snackBar.open(message, "✕", {
            duration,
            panelClass: ["toast-info"],
            horizontalPosition: "right",
            verticalPosition: "top",
        });
    }
}
