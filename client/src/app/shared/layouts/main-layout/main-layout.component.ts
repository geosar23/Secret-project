import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HeaderComponent } from "../../components/header/header.component";
import { BreadcrumbComponent } from "../../components/breadcrumb/breadcrumb.component";
import { SidebarComponent } from "../../components/sidebar/sidebar.component";
import { SidebarService } from "../../../core/services/sidebar.service";

@Component({
    selector: "app-main-layout",
    standalone: true,
    imports: [RouterOutlet, HeaderComponent, BreadcrumbComponent, SidebarComponent],
    template: `
        <app-header></app-header>
        <div class="shell">
            @if (sidebar.hasItems()) {
                <app-sidebar></app-sidebar>
            }
            <div class="shell-content">
                <app-breadcrumb></app-breadcrumb>
                <router-outlet></router-outlet>
            </div>
        </div>
    `,
    styles: `
        .shell {
            display: flex;
            align-items: flex-start;
        }

        .shell-content {
            flex: 1;
            min-width: 0;
        }
    `,
})
export class MainLayoutComponent {
    protected sidebar = inject(SidebarService);
}
