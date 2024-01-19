import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import * as moment from 'moment';
import {
  GanttItemAtemporal,
  ItemsMap
} from '../@model/gantt-item-atemporal.model';
import {
  applyEndToStartConstraint,
  buildConstraint,
  resolveEndToStartConstraint
} from './constraints.functions';
import * as ganttFn from './gantt-atemporal-task.functions';
import { ConstraintDescriptor } from '../@model/constraint.model';

export interface Header {
  gridStartDate: moment.Moment;
  columns: string[];
}

@Injectable()
export class GanttAtemporalService {
  private itemsMap: ItemsMap = new Map();
  private projectId: number;
  private itemsSubject: ReplaySubject<GanttItemAtemporal[]> =
    new ReplaySubject();
  private aTemporal: boolean;
  private projectConstraintsDescriptors: ConstraintDescriptor[];
  private constraintVersion = 0;
  public lockedTypeCodes: Set<string>;

  public set isATemporal(value: boolean) {
    this.aTemporal = value;
    if (this.itemsMap?.size) {
      this.updateMapItems(this.itemsMap, this.aTemporal);
    }
  }

  public get isATemporal(): boolean {
    return this.aTemporal;
  }

  init(
    ganttRows: GanttItemAtemporal[],
    constraints: ConstraintDescriptor[],
    constraintVersion: number
  ): void {
    this.constraintVersion = constraintVersion ?? 0;
    this.itemsMap = ganttFn.toMap([...ganttRows]);
    this.projectConstraintsDescriptors = constraints;
    this.projectId = ganttRows.find(
      (item) => item.typeCode === 'NR_PROJECT'
    )?.id;
    this.updateLockedTypeCodeList();
    this.itemsSubject.next(this.getItemsAsArray());
  }

  clear(): void {
    this.itemsMap?.clear();
    this.lockedTypeCodes?.clear();
    this.projectConstraintsDescriptors = [];
  }

  private getItemsAsArray(): GanttItemAtemporal[] {
    this.calculateProjectDuration();
    return ganttFn.sort(Array.from(this.itemsMap.values()));
  }

  getItems(): Observable<GanttItemAtemporal[]> {
    return this.itemsSubject.asObservable();
  }

  getItemsBuffer(): GanttItemAtemporal[] {
    return this.getItemsAsArray();
  }

  toggleActivation(itemId: number): void {
    ganttFn.toggleActivation(itemId, this.itemsMap);
    this.updateLockedTypeCodeList();
    this.updateMapItems(this.itemsMap, this.isATemporal);
  }

  calculateProjectDuration(): void {
    const items = Array.from(this.itemsMap.values());
    const prjDuration = ganttFn.calculateProjectDuration(
      items,
      ganttFn.getItemsToExclude(items)
    );
    const project = { ...this.itemsMap.get(this.projectId) };
    project.duration = prjDuration.duration;
    project.startMonth = prjDuration.start || 1;
    project.isActive = !!project.duration;
    project.mapStartDate = ganttFn.getMinValidPhaseDate(items) || null;
    project.mapEndDate = ganttFn.calculateProjectEndDate(
      items,
      ganttFn.getItemsToExclude(items)
    );
    project.isActive = !!project.duration;
    this.itemsMap.set(project.id, project);
  }

  updateMapItems(sourceMap: ItemsMap, isAtemporal: boolean): void {
    this.recalculateMap(sourceMap, isAtemporal).forEach((value, key) => {
      this.itemsMap.set(key, value);
    });
    this.itemsSubject.next(this.getItemsAsArray());
  }

  recalculateMap(sourceMap: ItemsMap, isAtemporal: boolean): ItemsMap {
    const items = [...(sourceMap.values() || [])]
      .filter(ganttFn.isPhase)
      .map((i) => ({ ...i }))
      .sort((i1, i2) => i1.order - i2.order);

    const result = new Map(
      ganttFn.computeGantt(items, isAtemporal).map((item) => [item.id, item])
    );
    const ganttStartDate = moment(ganttFn.getStartDate(items)).startOf('month');

    for (const constraintDescriptor of this.projectConstraintsDescriptors) {
      const constraint = buildConstraint(
        items.map((item) => item.id),
        result,
        constraintDescriptor
      );
      if (constraint) {
        const slavePhase = { ...result.get(constraint.slavePhase?.id) };
        const constraintResult = resolveEndToStartConstraint(constraint);
        if (slavePhase) {
          applyEndToStartConstraint(
            slavePhase,
            constraintResult,
            ganttStartDate,
            isAtemporal
          );
          result.set(slavePhase.id, slavePhase);
        }
      }
    }

    if (this.constraintVersion === 1) {
      // if engeneering has changed start date and was the first date, also materials has to change start date
      // so the items must be recalculated (to fix startMonth of project)
      const updatedItems = [...(result.values() || [])]
        .filter(ganttFn.isPhase)
        .map((i) => ({ ...i }))
        .sort((i1, i2) => i1.order - i2.order);

      const updatedResult = new Map(
        ganttFn
          .computeGantt(updatedItems, isAtemporal)
          .map((item) => [item.id, item])
      );
      return updatedResult;
    }

    return result;
  }

  getRightMostValue = (): number =>
    Math.max(
      ...this.getItemsAsArray().map((item) => item?.startMonth + item?.duration)
    );

  getMinDate(): moment.Moment {
    return ganttFn.getStartDate(this.getItemsAsArray());
  }

  getHeader(minCols: number): string[] {
    const duration = this.getRightMostValue();
    const cols = new Array(duration > minCols ? duration : minCols)
      .fill(1)
      .map((v, i) => v + i);
    if (this.isATemporal) {
      return cols;
    }
    const start = moment(this.getMinDate()).startOf('month');
    const months = [start.format('MM/YY')];
    cols.forEach((item) => {
      const cursor = moment(start).add(item, 'months');
      months.push(cursor.format('MM/YY'));
    });
    return months;
  }

  updateLockedTypeCodeList(): void {
    const locked: Set<string> = new Set();
    const activeItems = new Set(
      [...(this.itemsMap?.values() || [])]
        .filter((item) => !!item.isActive && !!ganttFn.isPhase(item))
        .map((item) => item.typeCode as string)
    );

    for (const constraintDescriptor of this.projectConstraintsDescriptors) {
      if (
        [...(constraintDescriptor.masterPhases || [])].some((item) =>
          activeItems.has(item)
        )
      ) {
        constraintDescriptor.slavePhases?.forEach((item) => locked.add(item));
      }
    }
    this.lockedTypeCodes = new Set(locked);
  }

  dispose(): void {
    this.clear();
    this.itemsSubject = new ReplaySubject();
  }
}
