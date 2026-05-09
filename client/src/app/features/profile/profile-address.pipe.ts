import { Pipe, PipeTransform } from "@angular/core";
import { IAddress } from "../../core/interfaces/user.interface";

@Pipe({ name: "profileAddress", standalone: true })
export class ProfileAddressPipe implements PipeTransform {
    transform(address: IAddress | undefined | null): string {
        if (!address) {
            return "";
        }
        return [address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
            .filter(Boolean)
            .join(", ");
    }
}
