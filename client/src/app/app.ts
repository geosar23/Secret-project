import { Component, inject, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { UpperCasePipe } from "@angular/common";
import { environment } from "../environments/environment";
import { HeaderComponent } from "./shared/components/header/header.component";
import { AuthService } from "./core/services/auth.service";

@Component({
    selector: "app-root",
    imports: [RouterOutlet, UpperCasePipe, HeaderComponent],
    templateUrl: "./app.html",
    styleUrl: "./app.scss",
})
export class App {
    private authService = inject(AuthService);

    protected readonly title = signal("client");
    protected readonly environment = environment;
    isAuthenticated$ = this.authService.isAuthenticated();
}
