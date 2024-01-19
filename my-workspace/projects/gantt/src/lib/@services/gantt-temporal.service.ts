import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { GanttRow } from 'projects/epms-main/src/app/@state/gantt.state';
import { Observable, ReplaySubject } from 'rxjs';
import { ItemUpdater } from '../@model/gantt-item-execution.model';
import {
  GanttItemTemporal,
  ItemsMap
} from '../@model/gantt-item-temporal.model';
import {
  applyUpdaterTemporal,
  ganttRowToUpdater
} from '../@model/gantt-item.mapper';
import { getSiblings } from './gantt-execution-task.functions';
import * as gridFn from './gantt-temporal-grid.functions';
import * as ganttFn from './gantt-temporal-task.functions';

export interface Header {
  gridStartDate: moment.Moment;
  columns: string[];
}

@Injectable()
export class GanttTemporalService {
  private itemsMap: ItemsMap = new Map();
  private commissionId: number;
  private itemsSubject: ReplaySubject<GanttItemTemporal[]> =
    new ReplaySubject();
  private headerSubject: ReplaySubject<Header> = new ReplaySubject();

  init(commissionObjects: GanttItemTemporal[]): void {
    this.itemsMap = ganttFn.toMap([...commissionObjects]);
    this.commissionId = commissionObjects.find(
      (item) => item.typeCode === 'COMMISSION'
    )?.id;
    gridFn.resolveProjectDates(this.commissionId, this.itemsMap);
    this.notifyMapUpdate();
  }

  getGanttHeader(): Header {
    return {
      gridStartDate: gridFn.getStartDate(this.itemsMap),
      columns: gridFn.getGridHeader(this.itemsMap)
    };
  }

  notifyMapUpdate(): void {
    this.headerSubject.next(this.getGanttHeader());
    this.itemsSubject.next(this.getItemsAsArray());
  }

  clear(): void {
    this.itemsMap.clear();
  }

  private getCommissionObjects(): GanttItemTemporal[] {
    const projectId = this.itemsMap.get(this.commissionId)?.parent || 0;
    return Array.from(this.itemsMap.values()).filter(
      (item) => item.id !== projectId
    );
  }

  private getItemsAsArray(): GanttItemTemporal[] {
    return ganttFn
      .sort(this.getCommissionObjects(), this.commissionId, this.itemsMap)
      .filter((item) => item.visible);
  }

  getItems(): Observable<GanttItemTemporal[]> {
    return this.itemsSubject.asObservable();
  }

  getItemsBuffer(): GanttItemTemporal[] {
    return this.getCommissionObjects();
  }

  getHeader(): Observable<Header> {
    return this.headerSubject.asObservable();
  }

  toggleCollapse(itemId: number): void {
    ganttFn.toggleCollapse(itemId, this.itemsMap);
    this.itemsSubject.next(this.getItemsAsArray());
  }

  toggleActivation(itemId: number): void {
    const siblings = getSiblings(itemId, this.itemsMap);
    ganttFn.toggleActivation(itemId, siblings, this.itemsMap);
    gridFn.resolveProjectDates(this.commissionId, this.itemsMap);
    this.notifyMapUpdate();
  }

  updateMapItems(sourceMap: ItemsMap): void {
    sourceMap.forEach((value, key) => this.itemsMap.set(key, value));
    gridFn.resolveProjectDates(this.commissionId, this.itemsMap);
    this.notifyMapUpdate();
  }

  applyModifiedRows(rows: GanttRow[]): void {
    rows.forEach((row) => this.updateItem(ganttRowToUpdater(row)));
  }

  updateItem(updater: ItemUpdater): void {
    const mapItem = this.itemsMap.get(updater.id);
    if (mapItem) {
      this.itemsMap.set(mapItem.id, applyUpdaterTemporal(mapItem, updater));
      gridFn.resolveProjectDates(this.commissionId, this.itemsMap);
      this.notifyMapUpdate();
    }
  }

  dispose(): void {
    this.itemsMap.clear();
    this.itemsSubject = new ReplaySubject();
  }
}
