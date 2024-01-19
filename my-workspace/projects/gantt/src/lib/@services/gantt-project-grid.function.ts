import * as moment from 'moment';
import { MtDate } from './gantt-execution-rollup.functions';
import * as executionFn from './gantt-execution-grid.functions';
import { GanttItem } from '../@model/gantt-item-project.model';
import { GanttBar } from '../@model/gantt-item-execution.model';

export interface GanttTaskBars {
    id: number;
    gridStartDate: moment.Moment;
    mapBar: GanttBar;
    plannedBar: GanttBar;
    effectiveBar: GanttBar;
}

export const calculateTodayCol = executionFn.calculateTodayCol;

export const calculateBar = executionFn.calculateBar;

const calculateEffectiveEndDate = (
    item: GanttItem,
    hasPlannedStart: boolean
): moment.Moment => {
    if (!!item.hasActualStartDate && hasPlannedStart) {
        return item.progress < 100
            ? moment()
            : moment(item.plannedEndDate?.value);
    }
    return moment.invalid();
};

export const calculateBars = (
    item: GanttItem,
    gridStartDate: moment.Moment,
    baselineColor: string,
    forecastColor: string,
    actualColor: string,
    actualCompletedColor: string,
    inactiveColor: string
): GanttTaskBars => {
    const resolveColor = (color: string) =>
        (item.isActive && color) || inactiveColor;
    const sameAsToday = (date: moment.Moment) =>
        moment()?.format('DD/MM/YYYY') === date?.format('DD/MM/YYYY');
    const hasMap =
        (item.mapStartDate as MtDate)?.isValid() &&
        (item.mapEndDate as MtDate)?.isValid();
    const hasStartPlanned = !!(
        item.plannedStartDate?.value as MtDate
    )?.isValid();
    const hasPlanned =
        hasStartPlanned && (item.plannedEndDate?.value as MtDate)?.isValid();
    const effectiveEnd = calculateEffectiveEndDate(item, hasStartPlanned);
    const mapBar =
        hasMap &&
        calculateBar(
            item.mapStartDate as MtDate,
            item.mapEndDate as MtDate,
            gridStartDate,
            resolveColor(baselineColor),
            sameAsToday(item.mapStartDate as MtDate)
        );
    const plannedBar =
        hasPlanned &&
        calculateBar(
            item.plannedStartDate?.value as MtDate,
            item.plannedEndDate?.value as MtDate,
            gridStartDate,
            resolveColor(forecastColor),
            sameAsToday(item.plannedStartDate?.value as MtDate)
        );
    const effectiveBar =
        effectiveEnd.isValid() &&
        calculateBar(
            item.plannedStartDate?.value as MtDate,
            effectiveEnd,
            gridStartDate,
            item.progress === 100
                ? resolveColor(actualCompletedColor)
                : resolveColor(actualColor),
            sameAsToday(item.plannedStartDate?.value as MtDate)
        );
    return {
        id: item.id,
        gridStartDate,
        mapBar,
        plannedBar,
        effectiveBar
    };
};
