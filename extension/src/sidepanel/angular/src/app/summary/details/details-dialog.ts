import {CommonModule} from "@angular/common";
import {Component, inject} from "@angular/core";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";

@Component({
    selector: 'details-dialog',
    templateUrl: './details-dialog.html',
    styleUrl: './details-dialog.scss',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatProgressSpinnerModule,
    ],
})
export class DetailsDialog {
    readonly dialogRef = inject(MatDialogRef<DetailsDialog>);
    data = inject<any>(MAT_DIALOG_DATA);

    updateData(newData: any) {
        this.data = newData;
    }

    closeDialog() {
        this.dialogRef.close()
    }
}