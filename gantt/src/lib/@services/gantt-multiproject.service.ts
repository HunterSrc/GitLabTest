import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { Observable, ReplaySubject } from 'rxjs';
import { GanttItemMultiProject, ItemsMap } from '../@model/gantt-item-multiproject.model';
import * as ganttFn from './gantt-multiproject-task.functions';

export interface Header {
    gridStartDate: moment.Moment;
    gridEndDate: moment.Moment;
    columns: string[];
}

@Injectable()
export class GanttMultiProjectService {

    private itemsMap: ItemsMap = new Map();
    private projectId: number;
    private itemsSubject: ReplaySubject<GanttItemMultiProject[]> = new ReplaySubject();
    private headerSubject: ReplaySubject<Header> = new ReplaySubject();

    init(gantt: GanttItemMultiProject[]): void {
        this.projectId = ganttFn.getProject(gantt)?.id;
        this.itemsMap = ganttFn.toMap(gantt);
        ganttFn.resolveProjectDates(this.projectId, this.itemsMap);
        ganttFn.collapseAll(this.itemsMap);

        this.notifyMapUpdate();
    }

    getGanttHeader(): Header {
        const project = this.itemsMap.get(this.projectId);
        return{
            gridStartDate: ganttFn.getStartDate(project),
            gridEndDate: ganttFn.getEndDate(project),
            columns: ganttFn.getGridHeader(this.itemsMap)
        };
    }

    notifyMapUpdate(): void {
        this.headerSubject.next(this.getGanttHeader());
        this.itemsSubject.next(this.getItemsAsArray());
    }

    clear(): void {
        this.itemsMap.clear();
    }

    private getPhases(): GanttItemMultiProject[] {
        return Array.from(this.itemsMap.values()).filter(item => item.id !== this.projectId);
    }

    private getItemsAsArray(): GanttItemMultiProject[] {
        return ganttFn.sort([...this.itemsMap.values()], this.projectId, this.itemsMap).filter(item => !!item.visible);
    }

    getItems(): Observable<GanttItemMultiProject[]> {
        return this.itemsSubject.asObservable();
    }

    getItemsBuffer(): GanttItemMultiProject[] {
        return this.getPhases();
    }

    getHeader(): Observable<Header> {
        return this.headerSubject.asObservable();
    }

    updateMapItems(sourceMap: ItemsMap): void {
        sourceMap.forEach((value, key) => this.itemsMap.set(key, value));
        ganttFn.resolveProjectDates(this.projectId, this.itemsMap);
        this.notifyMapUpdate();
    }

    dispose(): void {
        this.itemsMap.clear();
        this.itemsSubject = new ReplaySubject();
    }

    toggleCollapse(itemId: number): void {
        ganttFn.toggleCollapse(itemId, this.itemsMap);
        this.itemsSubject.next(this.getItemsAsArray());
    }

}
