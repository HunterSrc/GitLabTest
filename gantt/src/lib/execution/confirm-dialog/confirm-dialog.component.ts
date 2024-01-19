import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
  phaseName: string;
  commissionCode: string;
  activate: boolean;
}

@Component({
  selector: 'lib-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent implements OnInit {

  constructor(
    private dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: ConfirmDialogData
    ) { }

  getMessage = (): string =>
    `Confermi di voler ${ !!(this?.data?.activate) ? 'attivare' : 'disattivare'} la fase <<${this.data?.phaseName}>> della commessa ${ this.data?.commissionCode} ?`

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }

  ngOnInit(): void {
  }

}
