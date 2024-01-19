import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface AssignDialogData {
  phaseName: string;
  commissionCode: string;
  activate: boolean;
}

@Component({
  selector: 'lib-assign-dialog',
  templateUrl: './assign-dialog.component.html',
  styleUrls: ['./assign-dialog.component.scss'],
})
export class AssignDialogComponent implements OnInit {
  constructor(
    private dialogRef: MatDialogRef<AssignDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: AssignDialogData
  ) {}

  getMessage = (): string =>
    `Vuoi confermare la richiesta di associazione della ${this.data?.phaseName} al nodo <<Gare per fornitura in opera>> ?`;

  onAssign(): void {
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }

  ngOnInit(): void {}
}
