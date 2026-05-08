import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HeaderComponent } from "../../components/header/header.component";
import { BreadcrumbComponent } from "../../components/breadcrumb/breadcrumb.component";

@Component({
    selector: "app-main-layout",
    standalone: true,
    imports: [RouterOutlet, HeaderComponent, BreadcrumbComponent],
    template: `
        <app-header></app-header>
        <app-breadcrumb></app-breadcrumb>
        <router-outlet></router-outlet>
    `,
})
export class MainLayoutComponent {}
