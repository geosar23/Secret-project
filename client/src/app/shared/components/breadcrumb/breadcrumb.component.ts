import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterModule } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { MatIconModule } from "@angular/material/icon";
import { BreadcrumbService } from "../../../core/services/breadcrumb.service";

@Component({
    selector: "app-breadcrumb",
    standalone: true,
    imports: [RouterModule, MatIconModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (breadcrumbs().length > 0) {
            <nav class="breadcrumb-bar" aria-label="Breadcrumb">
                <ul class="breadcrumb-list">
                    <li class="breadcrumb-item">
                        <a routerLink="/dashboard" class="breadcrumb-home" aria-label="Home">
                            <mat-icon>home</mat-icon>
                        </a>
                        <mat-icon class="breadcrumb-separator" aria-hidden="true">chevron_right</mat-icon>
                    </li>
                    @for (crumb of breadcrumbs(); track $index; let last = $last) {
                        <li class="breadcrumb-item">
                            <a
                                [routerLink]="crumb.route ?? null"
                                class="breadcrumb-link"
                                [class.breadcrumb-current]="last"
                                [attr.aria-current]="last ? 'page' : null"
                                >{{ crumb.label }}</a
                            >
                            @if (!last) {
                                <mat-icon class="breadcrumb-separator" aria-hidden="true">chevron_right</mat-icon>
                            }
                        </li>
                    }
                </ul>
            </nav>
        }
    `,
    styleUrls: ["./breadcrumb.component.scss"],
})
export class BreadcrumbComponent {
    private breadcrumbService = inject(BreadcrumbService);
    breadcrumbs = toSignal(this.breadcrumbService.breadcrumbs$, { requireSync: true });
}
