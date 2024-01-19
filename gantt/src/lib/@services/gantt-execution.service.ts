import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { GanttRow } from 'projects/mon-impianti/src/app/@state/gantt.state';
import { Observable, ReplaySubject } from 'rxjs';
import { ConstraintDescriptor } from '../@model/constraint.model';
import { GanttItemExecution, ItemsMap, ItemUpdater } from '../@model/gantt-item-execution.model';
import { applyUpdaterExecution, ganttRowToUpdater } from '../@model/gantt-item.mapper';
import { GanttObject } from '../@model/gantt-object.model';
import { TypeCodeEnum } from '../@model/type-code.enum';
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

interface AssociationStatus {
    parentId: number;
}

@Injectable()
export class GanttExecutionService {

    private itemsMap: ItemsMap = new Map();
    private commissionId: number;
    private itemsSubject: ReplaySubject<GanttItemExecution[]> = new ReplaySubject();
    private headerSubject: ReplaySubject<Header> = new ReplaySubject();
    private activationStatusBackup: ActivationStatus[] = [];
    private associationStatusBackup: AssociationStatus;
    private constraintDescriptors: ConstraintDescriptor[];

    init(ganttObject: GanttObject<GanttItemExecution>): void {
        this.commissionId = ganttObject?.ganttRows?.find(item => item.typeCode === 'COMMISSION')?.id;
        this.itemsMap = ganttFn.toMap([...(ganttObject?.ganttRows || [])]);
        this.constraintDescriptors = [ ...ganttObject.constraints ];
        rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
        gridFn.resolveCommissionDates(this.commissionId, this.itemsMap);
        ganttFn.collapseAll(this.itemsMap);
        this.notifyMapUpdate();
    }


    getGanttHeader(): Header {
        const commission = this.itemsMap.get(this.commissionId);
        return{
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
        return ganttFn.sort(this.getCommissionObjects(), this.commissionId, this.itemsMap).filter(item => item.visible);
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
        const getActivationStatus = id => {
            const item = this.itemsMap.get(id);
            return !!item && { id: item.id, isActive: item.isActive, weight: item.weight} || null;
        };
        const siblings = ganttFn.getSiblings(itemId, this.itemsMap);
        this.activationStatusBackup = [itemId, ...siblings].map(getActivationStatus);
        ganttFn.toggleActivation(itemId, siblings, this.itemsMap);
        rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
        this.notifyMapUpdate();
    }
    
    restoreActivationBackup(itemId: number): void {
        this.activationStatusBackup.forEach(item => ganttFn.setWeight(item.id, this.itemsMap, item.weight, item.id === itemId));
        rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
        this.notifyMapUpdate();
    }

    getParentItem(item: any){
        const parentItem =  this.getItemsAsArray().filter(element => element.id === item?.parent);
        return parentItem ? parentItem[0] : null;
    }

    getContrattiPerFornituraId(): number{
        const contrattiItem = this.getItemsAsArray().filter(element => element.typeCode === TypeCodeEnum.TENDER_CONTRACTS_FOR);
        return contrattiItem[0].id;
    }

    getGarePerFornituraId(): number{
        const gareItem = this.getItemsAsArray().filter(element => element.typeCode === TypeCodeEnum.TENDER_CALLS_FOR);
        return gareItem[0].id;
    }

    getCostruzioneId(): number{
        const costruzioneItem = this.getItemsAsArray().filter(element => element.typeCode === TypeCodeEnum.CONSTRUCTION);
        return costruzioneItem[0].id;
    }
    
    getPermessiPrincipaliUrl(): string{
        const permessiPrincipaliItem = this.getItemsAsArray().filter(element => element.typeCode === TypeCodeEnum.PUB_AUTHORIZATIONS);
        return permessiPrincipaliItem[0].subjectDetail;
    }

    getAllPermessiPubblici(): GanttItemExecution[] {
        return this.getItemsBuffer().filter(
          (element) =>
            element.typeCode === TypeCodeEnum.PUB_ES_AUTH ||
            element.typeCode === TypeCodeEnum.PUB_SEC_AUTH ||
            element.typeCode === TypeCodeEnum.PUB_MAIN_AUTH
        );
      }

    restoreParentAndTypeBackup(itemId: number): void {
        const item = this.itemsMap.get(itemId);
        item.typeCode = TypeCodeEnum.TENDER_CALL;
        item.parent = this.associationStatusBackup.parentId;
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
            ganttFn.closeBatch(itemId, this.itemsMap);
        }
        rollupFn.updateMap(this.itemsMap, this.constraintDescriptors);
        this.notifyMapUpdate();
    }

    applyModifiedRows(rows: GanttRow[]): void {
        rows.forEach(row => this.updateItem(ganttRowToUpdater(row)));
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

    getBuasDate() {
        const commission = this.getItemsAsArray().filter(element => element.level === 1);
        return commission?.[0].baselineStartDate;
    }
}
