import { ConstraintDescriptor } from './constraint.model';
import { GanttItemAtemporal } from './gantt-item-atemporal.model';
import { GanttItemExecution } from './gantt-item-execution.model';
import { GanttItemTemporal } from './gantt-item-temporal.model';

export type GanttItemType =
    | GanttItemAtemporal
    | GanttItemTemporal
    | GanttItemExecution;

export interface GanttObject<T = GanttItemType> {
    ganttRows: T[];
    constraints: ConstraintDescriptor[];
    constraintVersion?: number;
}
