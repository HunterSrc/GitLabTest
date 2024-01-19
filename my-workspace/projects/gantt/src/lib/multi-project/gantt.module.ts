import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { GanttMultiProjectService } from '../@services/gantt-multiproject.service';
import { GanttMultiProjectComponent } from './gantt.component';
import { GridComponent } from './grid/grid.component';
import { TasksComponent } from './tasks/tasks.component';

@NgModule({
    declarations: [GridComponent, TasksComponent, GanttMultiProjectComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatChipsModule,
        MatIconModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatDialogModule
    ],
    providers: [GanttMultiProjectService],
    exports: [GanttMultiProjectComponent]
})
export class GanttMultiProjectModule {}
