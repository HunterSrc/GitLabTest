import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import * as moment from 'moment';
import * as projectFn from '../@services/gantt-project-task.function';
import { GanttItem, ItemsMap } from '../@model/gantt-item-project.model';
import { ConstraintDescriptor } from '../@model/constraint.model';
import { getMaxDate } from './gantt-execution-rollup.functions';

export interface Header {
    gridStartDate: moment.Moment;
    gridEndDate: moment.Moment;
    columns: string[];
}

interface ConstraintResult {
    order: number;
    computedStartDate: moment.Moment;
}

export const sortItems = (i1: GanttItem, i2: GanttItem) => i1.level !== i2.level ? i1.level - i2.level : i1.order - i2.order;

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

    init(gantt: GanttItem[], descriptors: ConstraintDescriptor[], editable: boolean): void {
        this.projectId = projectFn.getProject(gantt)?.id;
        this.itemsMap = projectFn.toMap(gantt);
        this.isProjectEditable = !!editable;
        this.constraintDescriptors = descriptors;
        this.alignStructsAndNotifyMapUpdate(new Set<string>([]));
    }

    getGanttHeader(): Header {
        const project = this.itemsMap.get(this.projectId);
        return{
            gridStartDate: projectFn.getStartDate(project),
            gridEndDate: projectFn.getEndDate(project),
            columns: projectFn.getGridHeader(this.itemsMap)
        };
    }

    alignStructsAndNotifyMapUpdate(slavesToUpdate: Set<string>): void {
        this.alignPhaseMap();
        if (this.isProjectEditable  && slavesToUpdate?.size > 0) {
            this.applyConstraints(slavesToUpdate);
        }
        projectFn.resolveProjectDates(this.projectId, this.itemsMap);
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
        return Array.from(this.itemsMap.values()).filter(item => item.id !== this.projectId);
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

    updateMapItems(sourceMap: ItemsMap, slavesToUpdate: Set<string>): void {
        sourceMap.forEach((value, key) => this.itemsMap.set(key, value));
        this.alignStructsAndNotifyMapUpdate(slavesToUpdate);
    }

    dispose(): void {
        this.clear();
        this.itemsSubject = new ReplaySubject();
    }

    alignPhaseMap(): void {
        [ ...(this.itemsMap.values() || [])]
            .filter(item => item?.level === 1)
            .forEach(item => this.phaseMap.set(item.typeCode, item));
    }

    // Check if a given item is actually a slave phase on a constraint and applies it
    resolveEndToStartConstraint(ganttItem: GanttItem, descriptor: ConstraintDescriptor, order: number): ConstraintResult {
        const typeCode = ganttItem.typeCode;
        // if a endPlannedDate is editable, no phases on the commission are actually ended
        const isMasterPhaseValid = phase => !!phase?.isActive //&& !!phase.endDatePlanned?.editable;
        // if a startPlannedDate is editable, no phases on the commission are actually started
        const isSlavePhaseValid = phase => !!phase?.isActive //&& !!phase.startDatePlanned?.editable;
        if (!!typeCode && descriptor.slavePhases?.has(typeCode)) {
            const masterPhases = [...(descriptor.masterPhases.values() || [])]
                .map(phase => this.phaseMap.get(phase))
                .filter(isMasterPhaseValid);
            const isValid = !!masterPhases?.length && isSlavePhaseValid(ganttItem);
            if (isValid) {
                this.slavePhasesTypeCodes.add(typeCode);
                const endDates = masterPhases?.map(item => item?.plannedEndDate?.value as moment.Moment).filter(d => !!d?.isValid());
                const computedStartDate = moment(getMaxDate(...endDates));
                return { order, computedStartDate};
            }
        }
        return null;
    }

    hasConstraint(ganttItem: GanttItem): boolean {
        return !!ganttItem?.typeCode && this.slavePhasesTypeCodes.has(ganttItem.typeCode);
    }

    applyConstraints(slavesToUpdate: Set<string>): void {
        const comparator = (i1, i2) => !!i1 && !!i2 && (i1.order - i2.order) || 0;
        const orderedIds = [...(this.phaseMap?.values() || [])].sort(comparator).map(item => item.id);
        this.slavePhasesTypeCodes.clear();
        for (const id of orderedIds) {
            const phase = { ...this.itemsMap.get(id) };
            if (phase) {
                for (const [index, descriptor]  of this.constraintDescriptors.entries()) {
                    if (slavesToUpdate.has(phase.typeCode)) {
                        const constraintResult = this.resolveEndToStartConstraint(phase, descriptor, index);
                        if (constraintResult) {
                            phase.plannedStartDate.value = constraintResult.computedStartDate;
                            const computedEndDate = moment(constraintResult.computedStartDate).add(this.getMapDuration(phase), 'days');
                            phase.plannedEndDate.value = computedEndDate;
                            this.itemsMap.set(phase.id, phase);
                            this.phaseMap.set(phase.typeCode, phase);
                        }
                    }
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
        let slavePhasesTypeCodes: Set<string> = new Set<string>();
        for (const constraintDescriptor of this.constraintDescriptors) {
            for (const masterPhase of constraintDescriptor.masterPhases) {
                if (!!ganttItem?.typeCode && ganttItem.typeCode == masterPhase) {
                    for (const slavePhaseCode of constraintDescriptor.slavePhases) {
                        slavePhasesTypeCodes.add(slavePhaseCode);
                    }
                }
            }
        }
        return slavePhasesTypeCodes;
    }

    //if the slave as inpit is also a master constraint, return the slave of that constraint
    getSlaveAlsoMaster(slave: string): Set<string> {
        let slavePhasesTypeCodes: Set<string> = new Set<string>();
        const isAlsoMaster = this.isAlsoMaster(slave);        
        if(isAlsoMaster){
            for (const constraintDescriptor of this.constraintDescriptors){
                for (const masterPhase of constraintDescriptor.masterPhases){
                    if (slave == masterPhase){
                        for (const slavePhaseCode of constraintDescriptor.slavePhases){
                            slavePhasesTypeCodes.add(slavePhaseCode);
                        }
                    }
                }
            }
        }
        return slavePhasesTypeCodes;
    }

    //Check if the slave as input is also a master constraint
    isAlsoMaster(slave: string): boolean {
        for (const constraintDescriptor of this.constraintDescriptors) {
            for (const masterPhase of constraintDescriptor.masterPhases) {
                if(slave === masterPhase){
                    return true;
                }
            }
        }
        return false;
    }
}
