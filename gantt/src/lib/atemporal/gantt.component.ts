import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { GanttRow } from 'projects/mon-impianti/src/app/@state/gantt.state';
import { GanttItemAtemporal } from '../@model/gantt-item-atemporal.model';
import { mapAtemporalRow } from '../@model/gantt-item.mapper';
import { GanttObject } from '../@model/gantt-object.model';
import { TypeCodeEnum } from '../@model/type-code.enum';
import { GanttAtemporalService } from '../@services/gantt-atemporal.service';
import { GridComponent } from './grid/grid.component';
import { TasksComponent } from './tasks/tasks.component';

@Component({
  selector: 'lib-gantt-atemporal',
  templateUrl: './gantt.component.html',
  styleUrls: [`./gantt.component.scss`]
})
export class GanttAtemporalComponent implements OnInit, OnDestroy {

  @ViewChild('tasks', { static: false }) tasks: TasksComponent;
  @ViewChild('grid', { static: false }) grid: GridComponent;

  private isLocked: boolean;
  private _editableTypes: Set<TypeCodeEnum> = new Set();
  private _isAtemporal: boolean = !!true;

  private isExport: boolean;

  @Input() set isAtemporal(value: boolean) {
    this._isAtemporal = !!value;
    this.ganttService.isATemporal = !!this._isAtemporal;
  }

  get isAtemporal(): boolean {
    return this._isAtemporal;
  }

  @Input() set export(value: boolean) {
    this.isExport = value;
  }

  get export(): boolean {
    return this.isExport;
  }

  @Input() set items(ganttObject: GanttObject<GanttItemAtemporal>) {
    if (ganttObject?.ganttRows) {
      this.ganttService.init(ganttObject.ganttRows, ganttObject.constraints);
    }
  }
  @Input() currentIds: number[];
  @Input() projectId: number;
  @Input() set ganttLocked(value: boolean) {
    this.isLocked = value;
  }

  @Output() isAtemporalChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  get locked(): boolean {
    return !!this.isLocked;
  }

  @Input() set editableTypes(types: Set<TypeCodeEnum>) {
    this._editableTypes = new Set(types);
  }

  get editableTypes(): Set<TypeCodeEnum> {
    return this._editableTypes;
  }

  constructor(private ganttService: GanttAtemporalService) {}

  ngOnInit(): void {
    this.ganttService.isATemporal = !!this.isAtemporal;
  }

  public getItems(): GanttItemAtemporal[] {
    return this.ganttService.getItemsBuffer();
  }

  public getRows(): GanttRow[] {
    const bufferItems = this.ganttService.getItemsBuffer();
    const ganttRows: GanttRow[] =  bufferItems.map(item => mapAtemporalRow(item));
    return ganttRows;
  }

  switchToAtemporal(): void {
    this._isAtemporal = true;
    this.isAtemporalChange.emit(!!this.isAtemporal);
  }

  switchToTemporal(): void {
    this._isAtemporal = false;
    this.isAtemporalChange.emit(!!this.isAtemporal);
  }

  ngOnDestroy(): void {
    if (!this.export) {
      this.ganttService.dispose();
    }
  }

}
