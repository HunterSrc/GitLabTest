import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  // tslint:disable-next-line
  selector: 'app-standard-activity-reset-dialog',
  templateUrl: './standard-activity-reset.component.html',
  styleUrls: ['./standard-activity-reset.component.scss']
})
export class StandardActivityResetConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<StandardActivityResetConfirmDialogComponent>
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
