import * as moment from 'moment';
import {
    getEndDate,
    getStartDate,
    shiftItem
} from './gantt-atemporal-task.functions';
import { GanttItemAtemporal } from '../@model/gantt-item-atemporal.model';
import {
    Constraint,
    ConstraintDescriptor,
    ConstraintResult,
    ConstraintType
} from '../@model/constraint.model';

export const validateConstraint = (constraint: Constraint): boolean =>
    !!constraint?.slavePhase && !!constraint.masterPhases?.length;

export const buildConstraint = (
    idsOrder: number[],
    itemsMap: Map<number, GanttItemAtemporal>,
    descriptor: ConstraintDescriptor
): Constraint | null => {
    const constraint: Constraint = {
        masterPhases: [],
        slavePhase: null,
        delay: descriptor.delay,
        type: descriptor.type
    };
    for (const id of idsOrder) {
        const item = itemsMap.has(id) && { ...itemsMap.get(id) };
        const typeCode: string = item.typeCode;
        if (
            descriptor.masterPhases.has(typeCode) &&
            !!item.isActive &&
            (descriptor.type === ConstraintType.START_DATE
                ? !item.hasActualStartDate
                : item.plannedEndDate?.editable ?? true)
        ) {
            constraint.masterPhases.push(item);
        }
        if (
            !constraint.slavePhase &&
            descriptor.slavePhases.has(typeCode) &&
            !!item.isActive
        ) {
            constraint.slavePhase = item;
        }
    }
    return (validateConstraint(constraint) && constraint) || null;
};

export const resolveEndToStartConstraint = (
    constraint: Constraint
): ConstraintResult => {
    let mapStartDate;
    let startMonth;

    // Campo type e delay aggiunti nella seconda versione dei legami.
    // Per retrocompatibilità il BE manderà anche per la prima versione dei legami i campi valorizzati come segue:
    // type  -> "END_DATE"
    // delay -> 0

    switch (constraint.type) {
        case ConstraintType.START_DATE:
            mapStartDate = getStartDate(constraint.masterPhases);

            startMonth = Math.min(
                ...constraint.masterPhases.map((item) => item.startMonth)
            );
            break;
        case ConstraintType.END_DATE:
            // getEndDate -> calcola la data massima tra tutti i master per il map TEMPORALE
            mapStartDate = getEndDate(constraint.masterPhases);
            // Math.max( -> calcola il numero di inizio da cui partire tra tutti i master per il map ATEMPORALE
            startMonth = Math.max(
                ...constraint.masterPhases.map(
                    (item) => item.startMonth + item.duration
                )
            );
            break;
    }

    // aggiungere "delay" (in mesi) che arriva dal BE a entrambe le casistiche.
    const mapStartDateWithDelay = moment(mapStartDate).add(
        constraint.delay ?? 0,
        'months'
    );

    const startMonthWithDelay = startMonth + constraint.delay ?? 0;
    return {
        mapStartDate: mapStartDateWithDelay,
        startMonth: startMonthWithDelay
    };
};

export const applyEndToStartConstraint = (
    item: GanttItemAtemporal,
    constraintResult: ConstraintResult,
    ganttStartDate: moment.Moment,
    isAtemporal = true
): void => {
    item.startMonth = constraintResult.startMonth;
    if (!isAtemporal && !!ganttStartDate?.isValid()) {
        const backupStartDate = moment(item.mapStartDate);
        item.mapStartDate =
            (constraintResult.mapStartDate?.isValid() &&
                moment(constraintResult.mapStartDate)) ||
            null;
        if (!backupStartDate.isSame(item.mapStartDate)) {
            shiftItem(item, ganttStartDate);
        }
    }
};
