import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GanttAtemporalModule } from './atemporal/gantt.module';
import { GanttExecutionModule } from './execution/gantt.module';
import { GanttMultiProjectModule } from './multi-project/gantt.module';
import { GanttAtemporalExportComponent } from './export/atemporal/export-atemporal.component';
import { GanttTemporalExportComponent } from './export/temporal/export-temporal.component';
import { GanttExportWrapperComponent } from './export/wrapper/export-wrapper.component';
import { GanttProjectModule } from './project/gantt.module';
import { GanttTemporalModule } from './temporal/gantt.module';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GanttAtemporalModule,
    GanttTemporalModule,
    GanttExecutionModule,
    GanttProjectModule,
    GanttMultiProjectModule,
    MatDividerModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatTooltipModule
  ],
  exports: [
    GanttAtemporalModule,
    GanttTemporalModule,
    GanttExecutionModule,
    GanttProjectModule,
    GanttMultiProjectModule
  ],
  declarations: [
    GanttAtemporalExportComponent,
    GanttTemporalExportComponent,
    GanttExportWrapperComponent
  ]
})
export class GanttModule {}
