import * as moment from 'moment';
import { TypeCodeUnion } from './type-code.enum';

export interface GanttItemAtemporal {
    id: number;
    name?: string;
    description: string;
    weight: number;
    typeCode: TypeCodeUnion;
    parent: number;
    level: number;
    startMonth: number;
    duration: number;
    isActive: boolean;
    isMilestone: boolean;
    order: number;
    childrenIdList: number[];
    subjectDetail: string;
    startDateManual?: boolean;
    startMonthManual?: boolean;
    endDateManual?: boolean;
    durationManual?: boolean;
    mapStartDate: moment.Moment | null;
    mapEndDate: moment.Moment | null;
    externalCode: string;
    hasActualStartDate?: boolean;
    plannedEndDate?: {
        editable?: boolean;
    };
}

export interface GanttBar {
    end: number;
    start: number;
    color: string;
}

export type ItemsMap = Map<number, GanttItemAtemporal>;
