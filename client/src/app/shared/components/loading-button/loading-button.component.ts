import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

@Component({
    selector: "app-loading-button",
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
    templateUrl: "./loading-button.component.html",
    styleUrls: ["./loading-button.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingButtonComponent {
    label = input("Save");
    loadingLabel = input("Saving...");
    loading = input(false);
    disabled = input(false);
    color = input<"primary" | "accent" | "warn">("primary");
    type = input<"button" | "submit">("button");
    minWidth = input("140px");

    buttonClick = output<MouseEvent>();

    onClick(event: MouseEvent): void {
        this.buttonClick.emit(event);
    }
}
