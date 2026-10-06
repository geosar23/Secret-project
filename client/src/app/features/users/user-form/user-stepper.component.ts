import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { UserFormStep } from "./user-form-steps";

@Component({
    selector: "app-user-stepper",
    standalone: true,
    imports: [MatIconModule],
    templateUrl: "./user-stepper.component.html",
    styleUrls: ["./user-stepper.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserStepperComponent {
    steps = input.required<readonly UserFormStep[]>();
    active = input.required<number>();

    stepSelected = output<number>();
}
