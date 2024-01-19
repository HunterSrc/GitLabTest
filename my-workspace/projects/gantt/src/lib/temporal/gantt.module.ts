import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { GanttTemporalService } from '../@services/gantt-temporal.service';
import { GanttTemporalComponent } from './gantt.component';
import { GridComponent } from './grid/grid.component';
import { TasksComponent } from './tasks/tasks.component';

@NgModule({
    declarations: [GanttTemporalComponent, GridComponent, TasksComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatChipsModule,
        MatIconModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatDialogModule
    ],
    providers: [GanttTemporalService],
    exports: [GanttTemporalComponent]
})
export class GanttTemporalModule {}
