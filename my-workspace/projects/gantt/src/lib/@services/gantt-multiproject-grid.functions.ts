import * as moment from 'moment';
import { GanttBar } from '../@model/gantt-item-execution.model';
import {
    GanttItemMultiProject,
    GanttTaskBars,
    ItemsMap
} from '../@model/gantt-item-multiproject.model';
import * as gridFn from './gantt-execution-grid.functions';

export type MtDate = moment.Moment;

export const getMinDate = (...dates: MtDate[]): MtDate =>
    dates.reduce((p: MtDate, c: MtDate) => (p?.isBefore(c) ? p : c), dates[0]);

export const getMaxDate = (...dates: MtDate[]): MtDate =>
    dates.reduce((p: MtDate, c: MtDate) => (p?.isAfter(c) ? p : c), dates[0]);

export function resolveCommissionDates(
    commissionId: number,
    map: ItemsMap
): void {
    const commission = { ...map.get(commissionId) };
    if (
        !commission?.baselineStartDate?.isValid() &&
        !commission?.baselineEndDate?.isValid()
    ) {
        const startBaseline = commission.childrenIdList
            ?.map((id) => map.get(id)?.baselineStartDate)
            .filter((d) => d?.isValid());
        const endBaseline = commission.childrenIdList
            ?.map((id) => map.get(id)?.baselineEndDate)
            .filter((d) => d?.isValid());
        if (!!startBaseline?.length && !!endBaseline?.length) {
            commission.baselineStartDate = getMinDate(...startBaseline);
            commission.baselineEndDate = getMaxDate(...endBaseline);
            map.set(commission.id, commission);
        }
    }
}

export function getMinItemDate(item: GanttItemMultiProject): MtDate {
    return moment(
        getMinDate(
            ...[
                item.baselineStartDate,
                item.actualStartDate,
                item.forecastStartDate,
                item.mapStartDate
            ].filter((d) => d?.isValid())
        )
    );
}

export function getMaxItemDate(item: GanttItemMultiProject): MtDate {
    return moment(
        getMaxDate(
            ...[
                item.baselineEndDate,
                item.actualEndDate,
                item.forecastEndDate,
                item.mapEndDate
            ].filter((d) => d?.isValid())
        )
    );
}

export const getQuarterStart = (day: number): number => {
    if (day < 7) {
        return 0;
    }
    if (day < 14) {
        return 1;
    }
    if (day < 21) {
        return 2;
    }
    if (day < 28) {
        return 3;
    }
    return 3;
};

export const getQuarterEnd = (day: number): number => {
    if (day < 7) {
        return 1;
    }
    if (day < 14) {
        return 2;
    }
    if (day < 21) {
        return 3;
    }
    if (day < 28) {
        return 4;
    }
    return 4;
};

export const calculateTodayCol = (
    gridStart: moment.Moment,
    colSpan = 4,
    paddingFn: (day: number) => number = getQuarterEnd
): number => {
    const startGridNormalized = moment(gridStart).startOf('month');
    const todayNormalized = moment().startOf('month');
    const monthsDiff = todayNormalized.diff(startGridNormalized, 'months');
    const padding = paddingFn(moment().date());
    return monthsDiff * colSpan + padding + 1;
};

export const calculateBar = (
    $start: moment.Moment,
    $end: moment.Moment,
    gridStart: moment.Moment,
    color: string,
    snapToToday = false,
    paddingStartFn: (day: number) => number = getQuarterStart,
    paddingEndFn: (day: number) => number = getQuarterEnd,
    colSpan = 4
): GanttBar => {
    const startGridNormalized = moment(gridStart).startOf('month');
    const startItemNormalized = moment($start).startOf('month');
    const endItemNormalized = moment($end).startOf('month');
    const monthsDiff = startItemNormalized.diff(startGridNormalized, 'months');
    const paddingStart = paddingStartFn($start?.date());
    const start = snapToToday
        ? calculateTodayCol(gridStart)
        : monthsDiff * colSpan + paddingStart + 1;
    const endDiff = endItemNormalized.diff(startGridNormalized, 'months');
    const paddingEnd = paddingEndFn($end?.date());
    const end = endDiff * colSpan + paddingEnd + 1;
    return {
        dateStart: moment($start),
        dateEnd: moment($end),
        start,
        end,
        color
    };
};

export const calculateBars = (
    item: GanttItemMultiProject,
    gridStartDate: moment.Moment,
    baselineColor: string,
    forecastColor: string,
    actualColor: string,
    actualCompletedColor: string,
    inactiveColor: string
): GanttTaskBars => {
    const sameAsToday = (date: moment.Moment) =>
        moment()?.format('DD/MM/YYYY') === date?.format('DD/MM/YYYY');
    const hasLastReauth =
        item.lastReauthStartDate?.isValid() &&
        item.lastReauthEndDate?.isValid();
    const hasForecast =
        item.forecastStartDate?.isValid() && item.forecastEndDate?.isValid();

    const hasActualStart = item.actualStartDate?.isValid();
    const actualEnd =
        (item.actualEndDate?.isValid() && item.actualEndDate) || moment();
    const lastReauthBar =
        hasLastReauth &&
        calculateBar(
            item.lastReauthStartDate,
            item.lastReauthEndDate,
            gridStartDate,
            baselineColor,
            sameAsToday(item.lastReauthStartDate as moment.Moment)
        );
    const forecastBar =
        hasForecast &&
        calculateBar(
            item.forecastStartDate,
            item.forecastEndDate,
            gridStartDate,
            forecastColor,
            sameAsToday(item.forecastStartDate as moment.Moment)
        );
    const actualBar =
        hasActualStart &&
        calculateBar(
            item.actualStartDate,
            actualEnd,
            gridStartDate,
            item.progress === 100 ? actualCompletedColor : actualColor,
            sameAsToday(item.actualStartDate as moment.Moment)
        );

    return {
        id: item.id,
        gridStartDate,
        lastReauthBar,
        actualBar,
        forecastBar
    };
};

export const makeStripedBar = gridFn.makeStripedBar;
