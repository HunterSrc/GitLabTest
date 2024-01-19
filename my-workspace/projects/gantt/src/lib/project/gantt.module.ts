import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { GanttProjectService } from '../@services/gantt-project.service';
import { GanttProjectExportWrapperComponent } from '../export/project/wrapper/export-wrapper.component';
import { GanttTemporalExportComponent } from '../export/project/gantt/export.component';
import { GanttProjectComponent } from './gantt.component';
import { GridComponent } from './grid/grid.component';
import { TasksComponent } from './tasks/tasks.component';

@NgModule({
    declarations: [
        GanttProjectComponent,
        GridComponent,
        TasksComponent,
        GanttProjectExportWrapperComponent,
        GanttTemporalExportComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatChipsModule,
        MatIconModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatDialogModule,
        MatSnackBarModule
    ],
    providers: [GanttProjectService],
    exports: [GanttProjectComponent, GanttProjectExportWrapperComponent]
})
export class GanttProjectModule {}
