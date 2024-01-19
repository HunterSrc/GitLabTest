import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { GanttDto } from 'projects/epms-main/src/app/@services/dtos/gantt.dto';
import { URLS } from 'projects/epms-main/src/app/@services/urls.constants';
import { EntityPath } from 'projects/epms-main/src/app/@state/entity-detail/entity-path';
import { GanttRow } from 'projects/epms-main/src/app/@state/gantt.state';
import { Observable, ReplaySubject } from 'rxjs';
import {
  ConstraintDescriptor,
  ConstraintType
} from '../@model/constraint.model';
import {
  GanttItemExecution,
  ItemUpdater,
  ItemsMap
} from '../@model/gantt-item-execution.model';
import {
  applyUpdaterExecution,
  ganttRowToUpdater
} from '../@model/gantt-item.mapper';
import { GanttObject } from '../@model/gantt-object.model';
import * as gridFn from './gantt-execution-grid.functions';
import * as rollupFn from './gantt-execution-rollup.functions';
import * as ganttFn from './gantt-execution-task.functions';

export interface Header {
  gridStartDate: moment.Moment;
  gridEndDate: moment.Moment;
  columns: string[];
}

interface ActivationStatus {
  id: number;
  isActive: boolean;
  weight: number;
}

@Injectable()
export class GanttExecutionService {
  private itemsMap: ItemsMap = new Map();
  private commissionId: number;
  private itemsSubject: ReplaySubject<GanttItemExecution[]> =
    new ReplaySubject();
  private headerSubject: ReplaySubject<Header> = new ReplaySubject();
  private activationStatusBackup: ActivationStatus[] = [];
  private constraintDescriptors: ConstraintDescriptor[];
  private BASEPATH = '/epms-webapp-snam/api' as const;

  constructor(
    private httpClient: HttpClient,
    protected router: Router
  ) {}

  init(ganttObject: GanttObject<GanttItemExecution>): void {
    this.commissionId = ganttObject?.ganttRows?.find(
      (item) => item.typeCode === 'COMMISSION'
    )?.id;
    this.itemsMap = ganttFn.toMap([...(ganttObject?.ganttRows || [])]);
    this.constraintDescriptors = [...ganttObject.constraints];
    rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
    gridFn.resolveCommissionDates(this.commissionId, this.itemsMap);

    // path è un array di entity da scorrere per aprire tutti quei nodi
    const path = EntityPath.fromString(this.router.routerState.snapshot.url);
    ganttFn.collapseAll(this.itemsMap, path);
    this.notifyMapUpdate();
  }

  init2(ganttObject: any): void {
    this.itemsMap = ganttFn.toMap([...(ganttObject.ganttRows || [])]);
    this.commissionId = ganttObject?.ganttRows?.find(
      (item) => item.typeCode === 'COMMISSION'
    )?.id;
    rollupFn.updateMap(this.itemsMap, ganttObject.constraintDescriptors);
    gridFn.resolveCommissionDates(this.commissionId, this.itemsMap);
    const path = EntityPath.fromString(this.router.routerState.snapshot.url);
    ganttFn.collapseAll(this.itemsMap, path);
    this.notifyMapUpdate();
  }

  getGanttHeader(): Header {
    const commission = this.itemsMap.get(this.commissionId);
    return {
      gridStartDate: gridFn.getMinItemDate(commission),
      gridEndDate: gridFn.getMaxItemDate(commission),
      columns: gridFn.getGridHeader(commission)
    };
  }

  notifyMapUpdate(): void {
    this.headerSubject.next(this.getGanttHeader());
    this.itemsSubject.next(this.getItemsAsArray());
  }

  clear(): void {
    this.itemsMap.clear();
    this.activationStatusBackup = [];
  }

  private getCommissionObjects(): GanttItemExecution[] {
    return Array.from(this.itemsMap.values());
  }

  private getItemsAsArray(): GanttItemExecution[] {
    return ganttFn
      .sort(this.getCommissionObjects(), this.commissionId, this.itemsMap)
      .filter((item) => item.visible);
  }

  getItems(): Observable<GanttItemExecution[]> {
    return this.itemsSubject.asObservable();
  }

  getItemsBuffer(): GanttItemExecution[] {
    return this.getCommissionObjects();
  }

  getItemsBufferAsMap(): ItemsMap {
    return this.itemsMap;
  }

  getHeader(): Observable<Header> {
    return this.headerSubject.asObservable();
  }

  toggleCollapse(itemId: number): void {
    ganttFn.toggleCollapse(itemId, this.itemsMap);
    this.itemsSubject.next(this.getItemsAsArray());
  }

  toggleActivation(itemId: number): void {
    const getActivationStatus = (id) => {
      const item = this.itemsMap.get(id);
      return (
        (!!item && {
          id: item.id,
          isActive: item.isActive,
          weight: item.weight
        }) ||
        null
      );
    };
    const siblings = ganttFn.getSiblings(itemId, this.itemsMap);
    this.activationStatusBackup = [itemId, ...siblings].map(
      getActivationStatus
    );
    ganttFn.toggleActivation(itemId, siblings, this.itemsMap);
    rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
    this.notifyMapUpdate();
  }

  restoreActivationBackup(itemId: number): void {
    this.activationStatusBackup.forEach((item) =>
      ganttFn.setWeight(item.id, this.itemsMap, item.weight, item.id === itemId)
    );
    rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
    this.notifyMapUpdate();
  }

  updateMapItems(sourceMap: ItemsMap): void {
    sourceMap.forEach((value, key) => this.itemsMap.set(key, value));
    rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
    this.notifyMapUpdate();
  }

  closeBatch(itemId: number): void {
    const item = this.itemsMap.get(itemId);
    if (item && ganttFn.isBatchClosable(item)) {
      this.getlastMovementDate(item.subjectDetail).subscribe(
        (dataUltimaMovimentazione) => {
          ganttFn.closeBatch(itemId, this.itemsMap, dataUltimaMovimentazione);
          rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
          this.notifyMapUpdate();
        }
      );
    }
  }

  applyModifiedRows(rows: GanttRow[]): void {
    rows.forEach((row) => this.updateItem(ganttRowToUpdater(row)));
  }

  updateItem(updater: ItemUpdater): void {
    const mapItem = this.itemsMap.get(updater.id);
    if (mapItem) {
      this.itemsMap.set(mapItem.id, applyUpdaterExecution(mapItem, updater));
      rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
      this.notifyMapUpdate();
    }
  }

  dispose(): void {
    this.clear();
    this.itemsSubject = new ReplaySubject();
  }

  resetDataOdlConstruction(
    odlId: number,
    resetBody: {
      isActive: boolean;
      commissionId: number;
      projectId: number;
      weight: number;
      ganttToSave: any;
    }
  ): Observable<GanttDto> {
    return this.httpClient.post<GanttDto>(
      URLS.resetDataOdlConstruction(odlId),
      resetBody
    );
  }
  lastMovementDate(subjectDetail: string) {
    return `${this.BASEPATH}/${subjectDetail}/lastMovementDate`;
  }
  public getlastMovementDate(subjectDetail: string) {
    return this.httpClient.get<string>(this.lastMovementDate(subjectDetail));
  }
}
