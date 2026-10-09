import { MatDialog } from "@angular/material/dialog";
import { Observable, map } from "rxjs";
import { ILeaveCreated } from "../../core/interfaces/leave.interface";
import { PermissionService } from "../../core/services/permission.service";
import {
    RequestLeaveDialogComponent,
    RequestLeaveDialogData,
} from "../leaves/request-leave-dialog/request-leave-dialog.component";

/** How the Requests page starts a request of one type. Add an entry when a new type gets a creation flow. */
export interface RequestCreator {
    icon: string;
    /** Can the current user start this type? The server still enforces it on submit. */
    canCreate: (permissions: PermissionService) => boolean;
    /** Opens the creation flow. Emits the new request id, or undefined when the user dismisses it. */
    open: (dialog: MatDialog) => Observable<string | undefined>;
}

/** Keyed by the request type key from `GET /api/request-types`. */
export const REQUEST_CREATORS: Record<string, RequestCreator> = {
    leave: {
        icon: "beach_access",
        canCreate: permissions => permissions.canRequestLeave(),
        open: dialog =>
            dialog
                .open<RequestLeaveDialogComponent, RequestLeaveDialogData, ILeaveCreated | undefined>(
                    RequestLeaveDialogComponent,
                    { data: {}, width: "32rem", maxWidth: "95vw" },
                )
                .afterClosed()
                .pipe(map(created => created?.requestId)),
    },
};
