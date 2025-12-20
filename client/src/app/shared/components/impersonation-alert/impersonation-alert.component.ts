import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";

@Component({
    selector: "app-impersonation-alert",
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatChipsModule],
    templateUrl: "./impersonation-alert.component.html",
    styleUrls: ["./impersonation-alert.component.scss"],
})
export class ImpersonationAlertComponent {
    @Input() isActive: boolean = false;
    @Input() selectedRole: string = "";
    @Input() isLoading: boolean = false;
    @Input() getRoleColor!: (role: string) => string;
    @Input() getRoleName!: (role: string) => string;
    @Output() onClose = new EventEmitter<void>();

    closeAlert(): void {
        this.onClose.emit();
    }
}
