import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';
import { MD5 } from 'object-hash';
import { GanttRow } from 'projects/epms-main/src/app/@state/gantt.state';
import { Subscription } from 'rxjs';
import {
  delay,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  tap
} from 'rxjs/operators';
import {
  GanttItemExecution,
  ItemsMap,
  ItemUpdater
} from '../@model/gantt-item-execution.model';
import { mapExecutionRow } from '../@model/gantt-item.mapper';
import { GanttObject } from '../@model/gantt-object.model';
import { TypeCodeEnum } from '../@model/type-code.enum';
import { GanttExecutionService } from '../@services/gantt-execution.service';
import { ColumnsDialogComponent } from './columns-dialog/columns-dialog.component';

const toUpdater = (
  item: GanttItemExecution,
  itemsMap: ItemsMap
): ItemUpdater => {
  const updater: ItemUpdater = {
    id: item.id,
    weight: item.weight,
    progress: item.progress,
    actualStartDate: (item.actualStartDate as moment.Moment)?.toDate() || null,
    actualEndDate: (item.actualEndDate as moment.Moment)?.toDate() || null,
    baselineStartDate:
      (item.baselineStartDate as moment.Moment)?.toDate() || null,
    baselineEndDate: (item.baselineEndDate as moment.Moment)?.toDate() || null,
    forecastStartDate:
      (item.forecastStartDate as moment.Moment)?.toDate() || null,
    forecastEndDate: (item.forecastEndDate as moment.Moment)?.toDate() || null,
    isActive: !!item.isActive
  };
  if (item.parent != null && itemsMap.has(item.parent)) {
    const parent = itemsMap.get(item.parent);
    updater.parentActualStartDate =
      (parent.actualStartDate as moment.Moment)?.toDate() || null;
    updater.parentActualEndDate =
      (parent.actualEndDate as moment.Moment)?.toDate() || null;
    updater.parentProgress = parent.progress;
    updater.parentWeight = parent.weight;
  }
  return updater;
};

@Component({
  selector: 'lib-gantt-execution',
  templateUrl: './gantt.component.html',
  styleUrls: ['./gantt.component.scss']
})
export class GanttExecutionComponent implements OnInit, OnDestroy {
  private _currentIds: number[];
  private _editableTypes: Set<TypeCodeEnum> = new Set();

  @Input() set items(ganttObject: GanttObject<GanttItemExecution>) {
    if (ganttObject?.ganttRows) {
      this.ganttService.init(ganttObject);
    }
  }
  @Input() set currentIds(values: number[]) {
    this._currentIds = [...values];
  }

  get currentIds(): number[] {
    return [...this._currentIds];
  }

  @Input() commissionId: number;
  @Input() isNominativa = !!true;
  @Input() ganttLocked: boolean;
  @Input() set editableTypes(types: Set<TypeCodeEnum>) {
    this._editableTypes = new Set(types);
  }

  get editableTypes(): Set<TypeCodeEnum> {
    return this._editableTypes;
  }

  @Output() updateCurrent: EventEmitter<ItemUpdater> = new EventEmitter();
  @Output() saveGantt = new EventEmitter();

  /* Subscriptions */
  private ganttSubscription: Subscription;
  private columnsDialogSub: Subscription;

  public showZeroWeightRows = true;
  public SHOWZEROWEIGHTROWS_STORAGE = 'showZeroWeightRows';
  @Output() projectStructureClick: EventEmitter<any> = new EventEmitter<any>();
  @Output() updateCurrentHeaderColumns: EventEmitter<any> =
    new EventEmitter<any>();
  @Output() hideShowProjectClick: EventEmitter<null> = new EventEmitter<null>();

  @Input() currentHeaderColumns: Set<string>;
  get currentHeaderColumnsList(): string[] {
    return !!this.currentHeaderColumns && Array.from(this.currentHeaderColumns);
  }

  @Input() showProjectBar = false;

  constructor(
    private ganttService: GanttExecutionService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (sessionStorage?.getItem(this.SHOWZEROWEIGHTROWS_STORAGE) == null) {
      sessionStorage?.setItem(
        this.SHOWZEROWEIGHTROWS_STORAGE,
        this.showZeroWeightRows.toString()
      );
    }

    this.showZeroWeightRows =
      sessionStorage?.getItem(this.SHOWZEROWEIGHTROWS_STORAGE) === 'true';

    this.ganttSubscription = this.ganttService
      .getItems()
      .pipe(
        mergeMap((_) => this.getItems()),
        filter(this.propagateChange.bind(this)),
        map((item) => toUpdater(item, this.getMap())),
        delay(500),
        distinctUntilChanged(
          (iu1: ItemUpdater, iu2: ItemUpdater) => MD5(iu1) === MD5(iu2)
        ),
        tap((updater) => this.updateCurrent.emit(updater))
      )
      .subscribe();
  }

  propagateChange = (item: GanttItemExecution): boolean =>
    this.currentIds.includes(item.id) || item.id === this.commissionId;

  updateItem(itemUpdater: ItemUpdater): void {
    this.ganttService.updateItem(itemUpdater);
  }

  public getItems(): GanttItemExecution[] {
    return this.ganttService.getItemsBuffer();
  }

  public getMap(): ItemsMap {
    return this.ganttService.getItemsBufferAsMap();
  }

  public getRows(): GanttRow[] {
    const isEditable = (item: GanttItemExecution): boolean =>
      this.editableTypes?.has(TypeCodeEnum[item.typeCode]);
    return this.ganttService
      .getItemsBuffer()
      .filter(isEditable)
      .map(mapExecutionRow);
  }

  ngOnDestroy(): void {
    this.ganttService.dispose();
    this.ganttSubscription?.unsubscribe();
    this.columnsDialogSub?.unsubscribe();
  }

  /** *************************************
   *            Button Handlers          *
   ************************************** */
  onZeroWeightClick = (): void => {
    this.showZeroWeightRows = !this.showZeroWeightRows;
    sessionStorage?.setItem(
      this.SHOWZEROWEIGHTROWS_STORAGE,
      this.showZeroWeightRows.toString()
    );
  };

  onColumnsClick = (): void => {
    this.columnsDialogSub = this.dialog
      .open(ColumnsDialogComponent, {
        width: '35%',
        autoFocus: false,
        panelClass: 'remove-dialog-padding',
        data: this.currentHeaderColumns
      })
      .afterClosed()
      .subscribe({
        next: (columns: string[]) => {
          if (columns) {
            this.updateCurrentHeaderColumns.emit(columns);
          }
        }
      });
  };

  onColumnsChange = ($event): void => {
    $event.source.checked = false;
  };

  onProjectStructureClick = (): void => {
    this.projectStructureClick.emit();
  };

  onHideShowProjectClick = (): void => {
    this.hideShowProjectClick.emit();
  };

  onSaveGantt = (): void => {
    this.saveGantt.emit();
  };
}
