import { getEndDate, shiftItem } from './gantt-atemporal-task.functions';
import { GanttItemAtemporal } from '../@model/gantt-item-atemporal.model';
import { Constraint, ConstraintDescriptor, ConstraintResult } from '../@model/constraint.model';
import * as moment from 'moment';

export const validateConstraint = (constraint: Constraint): boolean =>
    !!constraint?.slavePhase && !!constraint.masterPhases?.length;

export const buildConstraint = (
    idsOrder: number[],
    itemsMap: Map<number,
        GanttItemAtemporal>,
    descriptor: ConstraintDescriptor): Constraint => {
    const constraint: Constraint = { masterPhases: [], slavePhase: null };
    for (const id of idsOrder) {
        const item = itemsMap.has(id) && { ...itemsMap.get(id) };
        const typeCode: string = item.typeCode;
        if (descriptor.masterPhases.has(typeCode) && !!item.isActive) {
            constraint.masterPhases.push(item);
        }
        if (!constraint.slavePhase && descriptor.slavePhases.has(typeCode) && !!item.isActive) {
            constraint.slavePhase = item;
        }
    }
    return validateConstraint(constraint) && constraint || null;
};

export const resolveEndToStartConstraint = (constraint: Constraint): ConstraintResult => {
    const endDate = getEndDate(constraint.masterPhases);
    const endMonth = Math.max(...constraint.masterPhases.map(item => item.startMonth + item.duration));
    return { mapStartDate: moment(endDate), startMonth: endMonth };
};

export const applyEndToStartConstraint = (
    item: GanttItemAtemporal,
    constraintResult: ConstraintResult,
    ganttStartDate: moment.Moment,
    isAtemporal: boolean = true): void => {
    item.startMonth = constraintResult.startMonth;
    if (!isAtemporal && !!ganttStartDate?.isValid()) {
        const backupStartDate = moment(item.mapStartDate);
        item.mapStartDate = constraintResult.mapStartDate?.isValid() && moment(constraintResult.mapStartDate) || null;
        if (!backupStartDate.isSame(item.mapStartDate)) {
            shiftItem(item, ganttStartDate);
        }
    }
};
