import { Component, inject } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { AuthService } from "../../core/services/auth.service";

@Component({
    selector: "app-dashboard",
    standalone: true,
    imports: [
        AsyncPipe,
        RouterLink,
        MatToolbarModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
    ],
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
