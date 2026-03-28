import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";

@Component({
    selector: "app-sticky-alert",
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatChipsModule],
    templateUrl: "./sticky-alert.component.html",
    styleUrls: ["./sticky-alert.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StickyAlertComponent {
    isActive = input(false);
    isLoading = input(false);
    title = input("");
    message = input("");
    backgroundColor = input("linear-gradient(135deg, #f59e0b, #ec4899)");
    opacity = input(1);
    zIndex = input(1000);
    icon = input("info");
    contentLabel = input<string | undefined>(undefined);
    contentColor = input<string | undefined>(undefined);
    showCloseButton = input(true);
    onClose = output<void>();

    closeAlert(): void {
        this.onClose.emit();
    }
}
