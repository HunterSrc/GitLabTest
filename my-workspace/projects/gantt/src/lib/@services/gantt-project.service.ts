import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import * as moment from 'moment';
import * as projectFn from './gantt-project-task.function';
import { GanttItem, ItemsMap } from '../@model/gantt-item-project.model';
import {
  ConstraintDescriptor,
  ConstraintType
} from '../@model/constraint.model';
import { getMaxDate } from './gantt-execution-rollup.functions';
import { getMinStartDate } from './gantt-project-task.function';
import { buildConstraint } from './constraints.functions';

export interface Header {
  gridStartDate: moment.Moment;
  gridEndDate: moment.Moment;
  columns: string[];
}

interface ConstraintResult {
  order: number;
  computedStartDate: moment.Moment;
}

export const sortItems = (i1: GanttItem, i2: GanttItem) =>
  i1.level !== i2.level ? i1.level - i2.level : i1.order - i2.order;

@Injectable()
export class GanttProjectService {
  private itemsMap: ItemsMap = new Map();
  private constraintDescriptors: ConstraintDescriptor[] = [];
  private phaseMap: Map<string, GanttItem> = new Map();
  private slavePhasesTypeCodes: Set<string> = new Set();
  private projectId: number;
  private itemsSubject: ReplaySubject<GanttItem[]> = new ReplaySubject();
  private headerSubject: ReplaySubject<Header> = new ReplaySubject();
  private isProjectEditable: boolean;
  private constraintVersion: number;
  private isUnderReautorization: boolean;
  init(
    gantt: GanttItem[],
    descriptors: ConstraintDescriptor[],
    editable: boolean,
    constraintVersion: number,
    isUnderReautorization: boolean
  ): void {
    this.projectId = projectFn.getProject(gantt)?.id;
    this.itemsMap = projectFn.toMap(gantt);
    this.isProjectEditable = !!editable;
    this.constraintDescriptors = descriptors;
    this.constraintVersion = constraintVersion;
    this.isUnderReautorization = isUnderReautorization;
    this.alignStructsAndNotifyMapUpdate(true);
  }

  getConstraintVersion(): number {
    return this.constraintVersion;
  }

  isProjectUnderReautorization() {
    return this.isUnderReautorization;
  }

  getGanttHeader(): Header {
    const project = this.itemsMap.get(this.projectId);
    return {
      gridStartDate: projectFn.getStartDate(project),
      gridEndDate: projectFn.getEndDate(project),
      columns: projectFn.getGridHeader(this.itemsMap)
    };
  }

  getProject(): GanttItem {
    return this.itemsMap.get(this.projectId);
  }

  alignStructsAndNotifyMapUpdate(applyConstraint: boolean): void {
    this.alignPhaseMap();
    if (this.isProjectEditable && applyConstraint) {
      this.applyConstraints();
    }

    projectFn.resolveProjectDates(
      this.projectId,
      this.itemsMap,
      this.isUnderReautorization,
      this.constraintVersion === 0
    );
    this.headerSubject.next(this.getGanttHeader());
    this.itemsSubject.next(this.getItemsAsArray());
  }

  clear(): void {
    this.itemsMap.clear();
    this.phaseMap.clear();
    this.slavePhasesTypeCodes.clear();
    this.constraintDescriptors = [];
  }

  private getPhases(): GanttItem[] {
    return Array.from(this.itemsMap.values()).filter(
      (item) => item.id !== this.projectId
    );
  }

  private getItemsAsArray(): GanttItem[] {
    return [...this.itemsMap.values()].sort(sortItems);
  }

  getItems(): Observable<GanttItem[]> {
    return this.itemsSubject.asObservable();
  }

  getItemsBuffer(): GanttItem[] {
    return this.getPhases();
  }

  getHeader(): Observable<Header> {
    return this.headerSubject.asObservable();
  }

  updateMapItems(sourceMap: ItemsMap): void {
    sourceMap.forEach((value, key) => this.itemsMap.set(key, value));
    this.alignStructsAndNotifyMapUpdate(true);
  }

  dispose(): void {
    this.clear();
    this.itemsSubject = new ReplaySubject();
  }

  alignPhaseMap(): void {
    [...(this.itemsMap.values() || [])]
      .filter((item) => item?.level === 1)
      .forEach((item) => this.phaseMap.set(item.typeCode, item));
  }

  // Check if a given item is actually a slave phase on a constraint and applies it
  resolveEndToStartConstraint(
    ganttItem: GanttItem,
    descriptor: ConstraintDescriptor
  ): moment.Moment | null {
    const typeCode = ganttItem.typeCode;

    if (!!typeCode && descriptor.slavePhases?.has(typeCode)) {
      const masterPhases = [...(descriptor.masterPhases.values() || [])]
        .map((phase) => this.phaseMap.get(phase))
        .filter((phase) => !!phase?.isActive);

      const isValid = !!masterPhases?.length && !!ganttItem?.isActive;

      // Campo type e delay aggiunti nella seconda versione dei legami.
      // Per retrocompatibilità il BE manderà anche per la prima versione dei legami i campi valorizzati come segue:
      // type  -> "END_DATE"
      // delay -> 0
      if (!isValid || !descriptor.type) {
        return null;
      }

      this.slavePhasesTypeCodes.add(typeCode);
      let computedStartDate: moment.Moment;
      switch (descriptor.type) {
        case ConstraintType.START_DATE:
          computedStartDate = getMinStartDate(masterPhases);
          break;
        case ConstraintType.END_DATE:
          // getEndDate -> calcola la data massima tra tutti i master per il map TEMPORALE
          const endDates = masterPhases
            // !! prendo solo le fasi che non hanno data fine effettiva
            .filter((phase) => phase.progress !== 100)
            ?.map((item) => item?.plannedEndDate?.value as moment.Moment)
            .filter((d) => !!d?.isValid());
          computedStartDate =
            endDates.length > 0 ? moment(getMaxDate(...endDates)) : null;
          break;
      }

      // aggiungere "delay" che arriva dal BE. Attualmente dovrebbe arrivare sempre 0 in questo scenario.
      const computedStartDateWithDelay = computedStartDate?.add(
        descriptor.delay ?? 0,
        'months'
      );

      return computedStartDateWithDelay;
    }
  }

  hasConstraint(ganttItem: GanttItem): boolean {
    return (
      !!ganttItem?.typeCode && this.slavePhasesTypeCodes.has(ganttItem.typeCode)
    );
  }

  comparator = (i1, i2) => (!!i1 && !!i2 && i1.order - i2.order) || 0;

  canEditMapStartDate(slavePhase: any) {
    // CR141 si applica solo per nuovi legami
    if (this.constraintVersion === 0) {
      return true;
    }

    const project = this.itemsMap.get(this.projectId);
    if (
      moment(project?.mapStartDate).diff(
        moment(slavePhase?.mapStartDate),
        'days'
      ) === 0
    ) {
      return false;
    }

    return true;
  }

  applyConstraints(): void {
    const orderedIds = [...(this.phaseMap?.values() || [])]
      .sort(this.comparator)
      .map((item) => item.id);
    this.slavePhasesTypeCodes.clear();

    for (const constraintDescriptor of this.constraintDescriptors) {
      const result = new Map();
      for (const [key, value] of this.phaseMap) {
        result.set(value.id, value);
      }

      const constraint = buildConstraint(
        orderedIds,
        result,
        constraintDescriptor
      );

      if (constraint) {
        const slavePhase = { ...result.get(constraint.slavePhase?.id) };
        const computedStartDate = this.resolveEndToStartConstraint(
          slavePhase,
          constraintDescriptor
        );
        let check = false;
        const editStart = this.canEditMapStartDate(slavePhase);
        if (computedStartDate) {
          if (editStart) {
            check =
              slavePhase.plannedStartDate?.value?.diff(
                computedStartDate,
                'days'
              ) !== 0;

            slavePhase.plannedStartDate.value = computedStartDate;
          }
          // Recalculate end only if it is before start
          const start = moment(slavePhase.plannedStartDate.value);
          const end = moment(slavePhase.plannedEndDate.value);
          if (!end.isValid() || start.diff(end) > 0 || check) {
            const computedEndDate = moment(computedStartDate).add(
              this.getMapDuration(slavePhase),
              'days'
            );
            slavePhase.plannedEndDate.value = computedEndDate;
          }

          this.itemsMap.set(slavePhase.id, slavePhase);
          this.phaseMap.set(slavePhase.typeCode, slavePhase);
        }
      }
    }
  }

  getMapDuration(ganttItem: GanttItem): number {
    const mapStartDate = moment(ganttItem?.mapStartDate);
    const mapEndDate = moment(ganttItem?.mapEndDate);
    const mapDuration = mapEndDate.diff(mapStartDate, 'days');
    return mapDuration;
  }

  getSlaves(ganttItem: GanttItem): Set<string> {
    const slavePhasesTypeCodes: Set<string> = new Set<string>();
    for (const constraintDescriptor of this.constraintDescriptors) {
      for (const masterPhase of constraintDescriptor.masterPhases) {
        if (!!ganttItem?.typeCode && ganttItem.typeCode === masterPhase) {
          for (const slavePhaseCode of constraintDescriptor.slavePhases) {
            slavePhasesTypeCodes.add(slavePhaseCode);
          }
        }
      }
    }
    return slavePhasesTypeCodes;
  }
}
