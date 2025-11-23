import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { AuthService } from "../../../core/services/auth.service";
import { MatDivider } from "@angular/material/divider";

@Component({
    selector: "app-header",
    standalone: true,
    imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDivider
],
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
})
export class HeaderComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    currentUser$ = this.authService.currentUser$;

    logout(): void {
        this.authService.logout();
        this.router.navigate(["/login"]);
    }
}
