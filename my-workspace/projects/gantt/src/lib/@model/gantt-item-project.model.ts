import * as moment from 'moment';

export type DateType = Date | string | moment.Moment | null;

export const convertDate = (date: DateType): moment.Moment | null =>
    date ? moment(date) : null;

export interface Editable<T> {
    value: T;
    editable: boolean;
}

export interface GanttItem {
    id: number;
    externalCode: string;
    description: string;
    level: number;
    typeCode: string;
    name: string;
    parent: number;
    order: number;
    isActive: boolean;
    isMilestone: boolean;
    mapStartDate: DateType;
    mapEndDate: DateType;
    plannedStartDate: Editable<DateType>;
    plannedEndDate: Editable<DateType>;
    progress: number;
    delay: number;
    hasActualStartDate: boolean;
    duration: number;
    startMonth: number;
}

export const ganttItemMapper = (input: GanttItem): GanttItem => ({
    ...input,
    mapStartDate: convertDate(input.mapStartDate),
    mapEndDate: convertDate(input.mapEndDate),
    plannedStartDate: {
        ...input.plannedStartDate,
        value: convertDate(input.plannedStartDate.value)
    },
    plannedEndDate: {
        ...input.plannedEndDate,
        value: convertDate(input.plannedEndDate.value)
    }
});

export type ItemsMap = Map<number, GanttItem>;
