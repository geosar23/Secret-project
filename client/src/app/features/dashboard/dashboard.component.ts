import { Component, inject } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
    selector: "app-dashboard",
    standalone: true,
    imports: [AsyncPipe, RouterLink],
    templateUrl: "./dashboard.component.html",
    styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent {
    private authService = inject(AuthService);
    currentUser$ = this.authService.currentUser$;

    logout(): void {
        this.authService.logout();
    }
}
