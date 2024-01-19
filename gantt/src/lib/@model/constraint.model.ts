import { GanttItemAtemporal } from './gantt-item-atemporal.model';

export interface ConstraintDescriptor {
    masterPhases: Set<string>;
    slavePhases: Set<string>;
}

export interface Constraint {
    masterPhases: GanttItemAtemporal[];
    slavePhase: GanttItemAtemporal;
}

export interface ConstraintResult {
    mapStartDate: moment.Moment;
    startMonth: number;
}
