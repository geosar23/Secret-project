import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { RequestStatus } from "../../../core/interfaces/request.interface";
import { REQUEST_STATUS_BADGE, REQUEST_STATUS_LABEL } from "../../../core/enums/request-status.enum";

/** Status of an approval request as a `.badge`: always text, never colour alone. */
@Component({
    selector: "app-request-status-badge",
    standalone: true,
    templateUrl: "./request-status-badge.component.html",
    styleUrls: ["./request-status-badge.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestStatusBadgeComponent {
    status = input.required<RequestStatus>();

    protected label = computed(() => REQUEST_STATUS_LABEL[this.status()]);
    protected badgeClass = computed(() => `badge ${REQUEST_STATUS_BADGE[this.status()]}`);
}
