import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import * as moment from 'moment';
import { GanttRow } from 'projects/mon-impianti/src/app/@state/gantt.state';
import { mergeMap, tap } from 'rxjs/operators';
import { GanttItemExecution, ItemUpdater } from '../@model/gantt-item-execution.model';
import { GanttItemTemporal } from '../@model/gantt-item-temporal.model';
import { mapTemporalRow } from '../@model/gantt-item.mapper';
import { GanttObject } from '../@model/gantt-object.model';
import { TypeCodeEnum } from '../@model/type-code.enum';
import { GanttTemporalService } from '../@services/gantt-temporal.service';

const toUpdater = (item: GanttItemTemporal): ItemUpdater => ( {
    id: item.id,
    weight: item.weight,
    progress: item.progress,
    baselineStartDate: (item.baselineStartDate as moment.Moment)?.toDate() || null,
    baselineEndDate: (item.baselineEndDate as moment.Moment)?.toDate() || null
  } );


@Component({
  selector: 'lib-gantt-temporal',
  templateUrl: './gantt.component.html',
  styleUrls: ['./gantt.component.scss'],
})
export class GanttTemporalComponent implements OnDestroy {

  private isLocked: boolean;
  private _editableTypes: Set<TypeCodeEnum> = new Set();

  @Input() set items(ganttObject: GanttObject<GanttItemTemporal>) {
    if (!!ganttObject?.ganttRows) {
      this.ganttService.init(ganttObject.ganttRows as GanttItemTemporal[]);
    }
  }
  @Input() currentIds: number[];
  @Input() commissionId: number;
  @Input() set editableTypes(types: Set<TypeCodeEnum>) {
    this._editableTypes = new Set(types);
  }

  get editableTypes(): Set<TypeCodeEnum> {
    return this._editableTypes;
  }
  @Output() updatePhase: EventEmitter<ItemUpdater> = new EventEmitter();

  @Input() set ganttLocked(value: boolean) {
    this.isLocked = value;
  }

  get locked(): boolean {
    return !!this.isLocked;
  }

  constructor(private ganttService: GanttTemporalService) {
    this.ganttService.getItems().pipe(
      mergeMap(items => items.map(toUpdater)),
      tap(updater => this.updatePhase.emit(updater))
    ).subscribe();
  }

  public getItems(): GanttItemTemporal[] {
    return this.ganttService.getItemsBuffer();
  }

  public getRows(): GanttRow[] {
    return this.getItems().map(mapTemporalRow);
  }

  updateItem(itemUpdater: ItemUpdater): void {
    this.ganttService.updateItem(itemUpdater);
  }

  ngOnDestroy(): void {
    this.ganttService.dispose();
  }

}
