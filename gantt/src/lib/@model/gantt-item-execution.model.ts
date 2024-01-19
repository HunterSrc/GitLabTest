import * as moment from 'moment';
import { DateType } from './gantt-item-project.model';
import { TypeCodeUnion } from './type-code.enum';

export interface GanttItemExecutionBase {
        id: number;
        code: string;
        name: string;
        description: string;
        typeCode: TypeCodeUnion;
        parent: number;
        level: number;
        subjectDetail: string;
        childrenIdList: number[];
        weight: number;
        progress: number;
        baselineStartDate: DateType;
        baselineEndDate: DateType;
        actualStartDate: DateType;
        actualEndDate: DateType;
        forecastStartDate: DateType;
        forecastEndDate: DateType;
        order?: number;
        duration?: number;
        startMonth?: number;
        isMilestone?: boolean;
        isActive?: boolean;
        mapStartDate: DateType;
        mapEndDate: DateType;
        lastReauthStartDate: DateType;
        lastReauthEndDate: DateType;
}

export interface GanttItemExecution extends GanttItemExecutionBase {
    visible?: boolean;
    collapsed?: boolean;
    collapsable?: boolean;
    isSlaveOnConstraint?: boolean;
    hasComputedForecastStartDate?: boolean;
}

export interface ItemUpdater {
    id: number;
    progress: number;
    weight: number;
    actualStartDate?: Date;
    actualEndDate?: Date;
    forecastStartDate?: Date;
    forecastEndDate?: Date;
    baselineStartDate?: Date;
    baselineEndDate?: Date;
    plannedStartDate?: Date;
    plannedEndDate?: Date;
    mapStartDate?: Date;
    mapEndDate?: Date;
    lastReauthStartDate?: Date;
    lastReauthEndDate?: Date;
    startMonth?: number;
    duration?: number;
    parentActualStartDate?: Date;
    parentActualEndDate?: Date;
    parentProgress?: number;
    parentWeight?: number;
    isActive?: boolean;
    numeroTotale?: number;
    numeroOttenuti?: number;
    numeroAutorizzazione?: string;
}

export interface GanttBar {
    dateStart: moment.Moment;
    dateEnd: moment.Moment;
    end: number;
    start: number;
    color: string;
    completed?: boolean;
}

export interface GanttTaskBars {
    id: number;
    gridStartDate: moment.Moment;
    baselineBar: GanttBar;
    actualBar: GanttBar;
    forecastBar: GanttBar;
    mapBar?: GanttBar;
    lastReauthBar?: GanttBar;
}

const convertDate = (date: DateType): moment.Moment | null => date ? moment(date) : null;

export const ganttItemExecutionMapper = (source: GanttItemExecutionBase): GanttItemExecution => ({
    ...source,
    baselineStartDate: convertDate(source.baselineStartDate),
    actualStartDate: convertDate(source.actualStartDate),
    forecastStartDate: convertDate(source.actualStartDate),
    baselineEndDate: convertDate(source.baselineEndDate),
    actualEndDate: convertDate(source.actualEndDate),
    forecastEndDate: convertDate(source.forecastEndDate),
    visible: true,
    collapsed: true,
    collapsable: source.level > 1 && !!source.childrenIdList?.length,
    lastReauthStartDate: convertDate(source.lastReauthStartDate),
    lastReauthEndDate: convertDate(source.lastReauthEndDate),
    mapStartDate: convertDate(source.mapStartDate),
    mapEndDate: convertDate(source.mapEndDate),
});

export type ItemsMap = Map<number, GanttItemExecution>;

