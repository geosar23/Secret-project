import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HeaderComponent } from "../../components/header/header.component";

@Component({
    selector: "app-main-layout",
    standalone: true,
    imports: [RouterOutlet, HeaderComponent],
    template: `
        <app-header></app-header>
        <router-outlet></router-outlet>
    `,
})
export class MainLayoutComponent {}
