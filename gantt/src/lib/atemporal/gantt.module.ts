import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { GanttAtemporalService } from '../@services/gantt-atemporal.service';
import { GanttAtemporalComponent } from './gantt.component';
import { GridComponent } from './grid/grid.component';
import { TasksComponent } from './tasks/tasks.component';

@NgModule({
  declarations: [
    GanttAtemporalComponent,
    GridComponent,
    TasksComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatBadgeModule,
    MatSnackBarModule,
    MatButtonToggleModule,
  ],
  providers: [
    GanttAtemporalService
  ],
  exports: [
    GanttAtemporalComponent
  ]
})
export class  GanttAtemporalModule { }
