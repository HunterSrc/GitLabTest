import { GanttItemAtemporal } from './gantt-item-atemporal.model';

export interface ConstraintDescriptor {
    masterPhases: Set<string>;
    slavePhases: Set<string>;
    type: ConstraintType;
    version?: string;
    delay: number;
}

export enum ConstraintType {
    START_DATE = 'START_DATE',
    END_DATE = 'END_DATE'
}
export interface Constraint {
    masterPhases: GanttItemAtemporal[];
    slavePhase: GanttItemAtemporal;
    type: ConstraintType;
    version?: string;
    delay: number;
}

export interface ConstraintResult {
    mapStartDate: moment.Moment;
    startMonth: number;
}
