import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'projects/mon-impianti/src/app/layout/material.module';
import { AddPermissionComponent } from './add-permission-dialog.component';
import {MatGridListModule} from '@angular/material/grid-list';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AddPermissionComponent
  ],
  imports: [
    CommonModule, MaterialModule, MatGridListModule, ReactiveFormsModule
  ],
  exports: [
    AddPermissionComponent
  ]
})
export class AddPermissionDialogModule { }
