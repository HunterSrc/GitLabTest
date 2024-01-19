import * as moment from 'moment';
import {
    GanttBar,
    GanttItemExecution,
    GanttTaskBars,
    ItemsMap
} from '../@model/gantt-item-execution.model';
import {
    getMaxDate,
    getMinDate,
    MtDate
} from './gantt-execution-rollup.functions';

export function getMinItemDate(item: GanttItemExecution): MtDate {
    return moment(
        getMinDate(
            ...[
                item.baselineStartDate as moment.Moment,
                item.actualStartDate as moment.Moment,
                item.forecastStartDate as moment.Moment,
                item.mapStartDate as moment.Moment
            ].filter((d) => d?.isValid())
        )
    );
}

export function getMaxItemDate(item: GanttItemExecution): MtDate {
    return moment(
        getMaxDate(
            ...[
                item.baselineEndDate as moment.Moment,
                item.actualEndDate as moment.Moment,
                item.forecastEndDate as moment.Moment,
                item.mapEndDate as moment.Moment
            ].filter((d) => d?.isValid())
        )
    );
}

export function getGridHeader(commission: GanttItemExecution): string[] {
    const start: MtDate = getMinItemDate(commission).isValid()
        ? getMinItemDate(commission)
        : moment();
    const end: MtDate = getMaxItemDate(commission);
    const monthsDuration = end.diff(start, 'months') + 2 || 1;
    return new Array(monthsDuration)
        .fill(1)
        .map((val, index) =>
            start.add(!!index && val, 'months').format('MM/YY')
        );
}

export function resolveCommissionDates(
    commissionId: number,
    map: ItemsMap
): void {
    const commission = { ...map.get(commissionId) };
    const baselineStartDate = commission?.baselineStartDate as moment.Moment;
    const baselineEndDate = commission?.baselineEndDate as moment.Moment;
    if (!baselineStartDate?.isValid() && !baselineEndDate?.isValid()) {
        const startBaseline = commission.childrenIdList
            ?.map((id) => map.get(id)?.baselineStartDate as moment.Moment)
            .filter((d) => d?.isValid());
        const endBaseline = commission.childrenIdList
            ?.map((id) => map.get(id)?.baselineEndDate as moment.Moment)
            .filter((d) => d?.isValid());
        if (!!startBaseline?.length && !!endBaseline?.length) {
            commission.baselineStartDate = getMinDate(...startBaseline);
            commission.baselineEndDate = getMaxDate(...endBaseline);
            map.set(commission.id, commission);
        }
    }
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
    item: GanttItemExecution,
    gridStartDate: moment.Moment,
    baselineColor: string,
    forecastColor: string,
    actualColor: string,
    actualCompletedColor: string,
    mapColor: string,
    lastReauthColor: string,
    inactiveColor: string
): GanttTaskBars => {
    const resolveColor = (color: string) =>
        (item.isActive && color) || inactiveColor;
    const sameAsToday = (date: moment.Moment) =>
        moment()?.format('DD/MM/YYYY') === date?.format('DD/MM/YYYY');
    const hasBaseline =
        (item.baselineStartDate as moment.Moment)?.isValid() &&
        (item.baselineEndDate as moment.Moment)?.isValid();
    const hasForecast =
        (item.forecastStartDate as moment.Moment)?.isValid() &&
        (item.forecastEndDate as moment.Moment)?.isValid();

    const hasMap =
        (item.mapStartDate as moment.Moment)?.isValid() &&
        (item.mapEndDate as moment.Moment)?.isValid();
    const hasLastReauth =
        (item.lastReauthStartDate as moment.Moment)?.isValid() &&
        (item.lastReauthEndDate as moment.Moment)?.isValid();
    let mapBar;
    let lastReauthBar;

    const hasActualStart = (item.actualStartDate as moment.Moment)?.isValid();
    const actualEnd =
        ((item.actualEndDate as moment.Moment)?.isValid() &&
            item.actualEndDate) ||
        moment();
    const baselineBar =
        hasBaseline &&
        calculateBar(
            item.baselineStartDate as moment.Moment,
            item.baselineEndDate as moment.Moment,
            gridStartDate,
            resolveColor(baselineColor),
            sameAsToday(item.baselineStartDate as moment.Moment),
            item.isSlaveOnConstraint ? getQuarterEnd : getQuarterStart
        );
    const forecastBar =
        hasForecast &&
        calculateBar(
            item.forecastStartDate as moment.Moment,
            item.forecastEndDate as moment.Moment,
            gridStartDate,
            resolveColor(forecastColor),
            sameAsToday(item.forecastStartDate as moment.Moment),
            item.hasComputedForecastStartDate ? getQuarterEnd : getQuarterStart
        );
    const actualBar =
        hasActualStart &&
        calculateBar(
            item.actualStartDate as moment.Moment,
            actualEnd as moment.Moment,
            gridStartDate,
            !!item.actualEndDate && item.progress === 100
                ? actualCompletedColor
                : resolveColor(actualColor),
            sameAsToday(item.actualStartDate as moment.Moment)
        );

    mapBar =
        hasMap &&
        calculateBar(
            item.mapStartDate as moment.Moment,
            item.mapEndDate as moment.Moment,
            gridStartDate,
            resolveColor(mapColor),
            sameAsToday(item.mapStartDate as moment.Moment)
        );
    lastReauthBar =
        hasLastReauth &&
        calculateBar(
            item.lastReauthStartDate as moment.Moment,
            item.lastReauthEndDate as moment.Moment,
            gridStartDate,
            resolveColor(lastReauthColor),
            sameAsToday(item.lastReauthStartDate as moment.Moment)
        );

    return {
        id: item.id,
        gridStartDate,
        baselineBar,
        actualBar,
        forecastBar,
        mapBar,
        lastReauthBar
    };
};

export const makeStripedBar = (
    color: string
): string => `repeating-linear-gradient(\
    -45deg,\
    white,\
    white 0.5rem,\
    ${color} 0.1rem,\
    ${color} 0.8rem\
  )`;
