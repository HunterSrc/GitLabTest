import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { LegendModule } from 'projects/epms-main/src/app/components/legend/legend.module';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogGeneralComponent } from 'projects/epms-main/src/app/components/confirm-dialog-general/confirm-dialog-general.component';
import { GanttExecutionService } from '../@services/gantt-execution.service';
import { ColumnsDialogComponent } from './columns-dialog/columns-dialog.component';
import { GanttExecutionComponent } from './gantt.component';
import { GridComponent } from './grid/grid.component';
import { TasksComponent } from './tasks/tasks.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { StandardActivityResetConfirmDialogComponent } from './tasks/components/standard-activity-reset.component';

@NgModule({
  declarations: [
    GanttExecutionComponent,
    GridComponent,
    TasksComponent,
    ColumnsDialogComponent,
    ConfirmDialogComponent,
    StandardActivityResetConfirmDialogComponent,
    ConfirmDialogGeneralComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatToolbarModule,
    LegendModule,
    MatTooltipModule
  ],
  providers: [GanttExecutionService],
  exports: [GanttExecutionComponent]
})
export class GanttExecutionModule {}
