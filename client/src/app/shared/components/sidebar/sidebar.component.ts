import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { SidebarService } from "../../../core/services/sidebar.service";

@Component({
    selector: "app-sidebar",
    standalone: true,
    imports: [RouterLink, RouterLinkActive, MatIconModule],
    templateUrl: "./sidebar.component.html",
    styleUrls: ["./sidebar.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
    protected sidebar = inject(SidebarService);
}
