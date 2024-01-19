import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import * as moment from 'moment';
import { ProjectDates } from 'projects/epms-main/src/app/@services/dtos/progetto/progetto.detail.dto';
import { Subscription } from 'rxjs';
import { ConstraintDescriptor } from '../@model/constraint.model';
import { GanttItem } from '../@model/gantt-item-project.model';
import { TypeCodeEnum } from '../@model/type-code.enum';
import { GanttProjectService } from '../@services/gantt-project.service';
import { GridComponent } from './grid/grid.component';
import { TasksComponent } from './tasks/tasks.component';

export interface ProjectGantt {
  ganttRows: GanttItem[];
  constraints: ConstraintDescriptor[];
}

@Component({
  selector: 'lib-gantt-project',
  templateUrl: `./gantt.component.html`,
  styleUrls: [`./gantt.component.scss`]
})
export class GanttProjectComponent implements OnInit, OnDestroy {
  private _editableTypes: Set<TypeCodeEnum> = new Set();

  @ViewChild('tasks', { static: false }) tasks: TasksComponent;
  @ViewChild('grid', { static: false }) grid: GridComponent;

  @Input() set projectGantt(data: {
    projectGantt: ProjectGantt;
    editable: boolean;
    constraintVersion: number;
    isUnderReautorization: boolean;
  }) {
    if (data?.projectGantt?.ganttRows?.length) {
      this.ganttService.init(
        data.projectGantt.ganttRows,
        data.projectGantt.constraints,
        data.editable,
        data.constraintVersion,
        data.isUnderReautorization
      );
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

  @Input() isUnderReauth: boolean;
  @Output() saveGantt = new EventEmitter();

  private ganttSubscription: Subscription;

  constructor(private ganttService: GanttProjectService) {}

  ngOnInit(): void {}

  get saveDisabled(): boolean {
    return this.tasks?.saveDisbaled();
  }

  get ganttLocked(): boolean {
    return !!this.locked;
  }

  public getItems(): GanttItem[] {
    return this.ganttService.getItemsBuffer();
  }

  public hasItems(): boolean {
    return !!this.ganttService.getItemsBuffer()?.length;
  }

  public getPlannedDates(): ProjectDates<moment.Moment>[] {
    return this.getItems().map((item) => ({
      id: item.id,
      plannedStartDate: {
        value: item.plannedStartDate?.value as moment.Moment,
        editable: item.plannedStartDate?.editable
      },
      plannedEndDate: {
        value: item.plannedEndDate?.value as moment.Moment,
        editable: item.plannedEndDate?.editable
      },
      mapStartDate: item.mapStartDate as moment.Moment,
      mapEndDate: item.mapEndDate as moment.Moment,
      duration: item.duration,
      startMonth: item.startMonth,
      typeCode: item.typeCode,
      level: item.level,
      isActive: item.isActive,
      isMilestone: item.isMilestone
    }));
  }

  ngOnDestroy(): void {
    if (!this.export) {
      this.ganttService.dispose();
    }
    this.ganttSubscription?.unsubscribe();
  }
}
