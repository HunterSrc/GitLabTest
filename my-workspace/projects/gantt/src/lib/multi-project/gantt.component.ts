import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { GanttItemMultiProject } from '../@model/gantt-item-multiproject.model';
import { TypeCodeEnum } from '../@model/type-code.enum';
import { GanttMultiProjectService } from '../@services/gantt-multiproject.service';
import { GridComponent } from './grid/grid.component';
import { TasksComponent } from './tasks/tasks.component';

@Component({
  selector: 'lib-gantt-multi-project',
  templateUrl: 'gantt.component.html',
  styleUrls: ['gantt.component.scss']
})
export class GanttMultiProjectComponent implements OnInit, OnDestroy {
  private _editableTypes: Set<TypeCodeEnum> = new Set();

  @ViewChild('tasks', { static: false }) tasks: TasksComponent;
  @ViewChild('grid', { static: false }) grid: GridComponent;

  @Input() set items(ganttItems: GanttItemMultiProject[]) {
    if (ganttItems?.length) {
      this.ganttService.init(ganttItems);
    }
  }
  @Input() projectId: number;
  @Input() locked: boolean;
  @Input() export = !!false;
  @Input() set editableTypes(types: Set<TypeCodeEnum>) {
    this._editableTypes = new Set(types);
  }

  get editableTypes(): Set<TypeCodeEnum> {
    return this._editableTypes;
  }

  private ganttSubscription: Subscription;

  constructor(private ganttService: GanttMultiProjectService) {}

  ngOnInit(): void {}

  get ganttLocked(): boolean {
    return !!this.locked;
  }

  public getItems(): GanttItemMultiProject[] {
    return this.ganttService.getItemsBuffer();
  }

  ngOnDestroy(): void {
    this.ganttService.dispose();
    this.ganttSubscription?.unsubscribe();
  }
}
