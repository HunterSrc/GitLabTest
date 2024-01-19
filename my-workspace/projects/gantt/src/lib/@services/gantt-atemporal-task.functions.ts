import * as moment from 'moment';
import {
    mergeDurationAndPoints,
    mergePhaseDurationSequence
} from './duration.functions';
import { Interval } from '../@model/interval.model';
import {
    GanttItemAtemporal,
    ItemsMap
} from '../@model/gantt-item-atemporal.model';
import { TypeCodeEnum, TypeCodeUnion } from '../@model/type-code.enum';
import { getMaxDate, getMinDate } from './gantt-execution-rollup.functions';

export const toMap = (items: GanttItemAtemporal[]): ItemsMap =>
    new Map(items.map((item) => [item.id, item]));

export const toggleActivation = (itemId: number, map: ItemsMap): void => {
    const item = map.get(itemId);
    if (item) {
        setActivation(item.id, map, !item.isActive);
    }
};

const setActivation = (itemId: number, map: ItemsMap, value: boolean): void => {
    const item = map.get(itemId);
    if (item && isPhase(item)) {
        const _item = { ...item };
        _item.isActive = value;
        map.set(item.id, _item);
    }
};

export const calculateProjectDuration = (
    items: GanttItemAtemporal[],
    exclude: GanttItemAtemporal[]
): Interval => {
    const toExcludedIdsSet = new Set(exclude.map((item) => item.id));
    const allPhasesDuration: Interval = mergePhaseDurationSequence(
        items
            .filter((item) => !toExcludedIdsSet.has(item.id))
            .map((item) => ({
                start: item.startMonth,
                duration: item.duration
            }))
    );
    const milestones = items
        .filter((item) => item.isMilestone)
        .filter((item) => item.isActive)
        .map((item) => item.startMonth);
    return mergeDurationAndPoints(allPhasesDuration, milestones);
};

export const calculateProjectEndDate = (
    items: GanttItemAtemporal[],
    exclude: GanttItemAtemporal[]
): moment.Moment => {
    const toExcludedIdsSet = new Set(exclude.map((item) => item.id));
    return getEndDate(items.filter((item) => !toExcludedIdsSet.has(item.id)));
};

export const sort = (items: GanttItemAtemporal[]): GanttItemAtemporal[] => {
    const project = items.find(isProject);
    const tasks = items
        .filter((item) => item.level === 1)
        .sort((t1, t2) => t1.order - t2.order);
    return [project, ...tasks];
};

export const isPhase = (item: GanttItemAtemporal): boolean =>
    [
        TypeCodeEnum.ENGINEERING,
        TypeCodeEnum.MATERIALS,
        TypeCodeEnum.AUTHORIZATIONS,
        TypeCodeEnum.JOB_PROCUREMENT,
        TypeCodeEnum.CONSTRUCTION,
        TypeCodeEnum.ENTRY_INTO_SERVICE
    ].some((type) => type === TypeCodeEnum[item?.typeCode]) ||
    item?.level === 1;

export const isProject = (item: GanttItemAtemporal): boolean =>
    TypeCodeEnum.NR_PROJECT === TypeCodeEnum[item?.typeCode] ||
    item?.level === 0;

export const getPeers = (
    item: GanttItemAtemporal,
    map: ItemsMap
): GanttItemAtemporal[] =>
    Array.from(map.values()).filter(
        (_item) =>
            item.id !== _item.id &&
            item.parent === _item.parent &&
            _item.isActive
    );

export const getItemsByTypeCode = (
    items: GanttItemAtemporal[],
    typeCodes: TypeCodeUnion[]
): GanttItemAtemporal[] => {
    const typesSet = new Set(typeCodes);
    return items.filter((item) => typesSet.has(item.typeCode));
};

export const getItemsToExclude = (
    items: GanttItemAtemporal[]
): GanttItemAtemporal[] => {
    const isNotActivePhasePredicate = (item) =>
        !isPhase(item) || !item.isActive;
    const hasInvalidDurationPredicate = (item) =>
        !item.startMonth || (!item.isMilestone && !item.duration);
    const restorationItemIds = new Set(
        getItemsByTypeCode(items, ['RESTORATIONS']).map((item) => item.id)
    );
    return items.filter(
        (item) =>
            isNotActivePhasePredicate(item) ||
            hasInvalidDurationPredicate(item) ||
            restorationItemIds.has(item.id)
    );
};

export const computeGantt = (
    items: GanttItemAtemporal[],
    isAtemporal: boolean
): GanttItemAtemporal[] => {
    const itemsPhase = items.filter((item) => item.level === 1);
    let minPhaseDate: moment.Moment = getMinValidPhaseDate(itemsPhase);
    if (!minPhaseDate && !isAtemporal) {
        const dates = itemsPhase
            .map((item) =>
                item.mapEndDate?.isValid()
                    ? moment(item.mapEndDate).subtract(item.duration, 'months')
                    : moment()
            )
            .filter((date) => date?.isValid());
        minPhaseDate = getMinDate(...dates);
    }
    if (minPhaseDate?.isValid()) {
        itemsPhase.forEach((item) =>
            alignGanttItemProps(item, isAtemporal, minPhaseDate)
        );
    }
    return [...itemsPhase];
};

export const getMinValidPhaseDate = (
    items: GanttItemAtemporal[]
): moment.Moment => {
    const dates = items
        .filter((item) => item.level === 1 && !!item.isActive)
        .map((item) => item.mapStartDate)
        .filter((date) => date?.isValid());
    return getMinDate(...dates);
};

export const getStartDate = (items: GanttItemAtemporal[]): moment.Moment => {
    const dates = items
        .filter((item) => !!item.isActive)
        .map((item) => item.mapStartDate)
        .filter((date) => date?.isValid());
    return getMinDate(...dates);
};

export const getEndDate = (items: GanttItemAtemporal[]): moment.Moment => {
    const dates = items
        .map((item) => item.mapEndDate)
        .filter((date) => date?.isValid());
    return (!!dates && getMaxDate(...dates)) || null;
};

const adjustItemStartMonth = (
    item: GanttItemAtemporal,
    startDate: moment.Moment
): void => {
    if (item.mapStartDate?.isValid()) {
        const normalizedStart =
            item.mapStartDate.date() > 15
                ? moment(item.mapStartDate).startOf('month').add(1, 'month')
                : moment(item.mapStartDate).startOf('month');
        const startMonth =
            moment(normalizedStart).diff(startDate, 'months') + 1;
        item.startMonth = startMonth < 0 ? 1 : startMonth;
    }
};

const adjustItemValues = (item: GanttItemAtemporal): void => {
    item.startMonth =
        !item.startMonth || item.startMonth < 0
            ? 0
            : Math.round(item.startMonth);
    item.duration =
        !item.duration || item.duration < 0 ? 0 : Math.round(item.duration);
    if (!item.isActive) {
        item.mapStartDate = null;
        item.mapEndDate = null;
        item.startMonth = 0;
        item.duration = 0;
        item.startDateManual = false;
        item.endDateManual = false;
        item.durationManual = false;
        item.startMonthManual = false;
    }
    if (
        moment(item.mapStartDate).isValid() &&
        moment(item.mapEndDate).isValid() &&
        moment(item.mapEndDate).isBefore(item.mapStartDate)
    ) {
        item.mapEndDate = moment(item.mapStartDate);
        item.duration = 0;
        item.startDateManual = false;
        item.endDateManual = false;
        item.durationManual = false;
        item.startMonthManual = false;
    }
};

export const shiftItem = (
    item: GanttItemAtemporal,
    ganttStartDate: moment.Moment
): void => {
    item.mapEndDate = moment(item.mapStartDate).add(item.duration, 'months');
    return adjustItemStartMonth(item, ganttStartDate);
};

const stretchItem = (
    item: GanttItemAtemporal,
    ganttStartDate: moment.Moment
): void => {
    item.mapStartDate = moment(item.mapEndDate).subtract(
        item.duration,
        'months'
    );
    return adjustItemStartMonth(item, ganttStartDate);
};

const untouchedItem = (item: GanttItemAtemporal): boolean =>
    [item.durationManual, item.startMonthManual].some((t) => !!t);

export const alignGanttItemProps = (
    item: GanttItemAtemporal,
    isAtemporal: boolean,
    minDate: moment.Moment
): void => {
    const ganttStartDate = moment(minDate).startOf('month');
    const normalize = (date: moment.Moment): moment.Moment =>
        date?.date() <= 15
            ? moment(date).startOf('month')
            : moment(date).add(1, 'months').startOf('month');

    adjustItemValues(item);

    if (isAtemporal) {
        if (item.startMonth) {
            if (item.startMonthManual) {
                const startMonth =
                    item.startMonth > 0 ? item.startMonth - 1 : 0;
                item.mapStartDate = moment(ganttStartDate).add(
                    startMonth,
                    'months'
                );
                item.mapEndDate = moment(item.mapStartDate).add(
                    item.duration,
                    'months'
                );
            }
            if (item.durationManual) {
                if (
                    !item.mapStartDate?.isValid() &&
                    item.mapEndDate?.isValid()
                ) {
                    return stretchItem(item, ganttStartDate);
                }
                if (item.mapStartDate?.isValid()) {
                    return shiftItem(item, ganttStartDate);
                }
            }
        }
    } else {
        if (!!item.startDateManual && item.mapStartDate?.isValid()) {
            return shiftItem(item, ganttStartDate);
        }
        if (!!item.endDateManual && item.mapEndDate?.isValid()) {
            if (!item.mapStartDate?.isValid()) {
                return stretchItem(item, ganttStartDate);
            }
            item.duration = normalize(item.mapEndDate).diff(
                normalize(item.mapStartDate),
                'months'
            );
            return adjustItemStartMonth(item, ganttStartDate);
        }
        if (item.durationManual) {
            if (!item.mapStartDate?.isValid() && item.mapEndDate?.isValid()) {
                return stretchItem(item, ganttStartDate);
            }
            if (item.mapStartDate?.isValid()) {
                return shiftItem(item, ganttStartDate);
            }
        }
        // UNTOUCHED ITEMS
        if (item.mapStartDate?.isValid() && item.mapEndDate?.isValid()) {
            return adjustItemStartMonth(item, ganttStartDate);
        }
        if (!item.mapStartDate?.isValid()) {
            const startMonth = item.startMonth > 0 ? item.startMonth - 1 : 0;
            item.mapStartDate = moment(ganttStartDate).add(
                startMonth,
                'months'
            );
        }
        if (!item.mapEndDate?.isValid()) {
            item.mapEndDate = moment(item.mapStartDate).add(
                item.duration,
                'months'
            );
        }
    }
};

export type GanttEvaluation = { isTemporal: boolean; errors: string[] };

export const validateMap = (items: GanttItemAtemporal[]): GanttEvaluation => {
    const hasStartDate = (item: GanttItemAtemporal) =>
        !!item.isActive && item.mapStartDate?.isValid();
    const hasEndDate = (item: GanttItemAtemporal) =>
        !!item.isActive && item.mapStartDate?.isValid();
    const consistentDates = (d1: moment.Moment, d2: moment.Moment) =>
        d2.isSameOrAfter(d1);
    const phaseItems = items.filter(isPhase);
    const hasSomeDate = phaseItems.some(
        (item) => hasStartDate(item) || hasEndDate(item)
    );
    const errors = [];
    if (hasSomeDate) {
        phaseItems.forEach((item) => {
            if (!(hasStartDate(item) && hasEndDate(item))) {
                errors.push(item.typeCode);
            }
        });
    }
    const isTemporal = !!errors.length && hasSomeDate;
    if (isTemporal) {
        phaseItems.forEach((item) => {
            if (!consistentDates(item.mapStartDate, item.mapEndDate)) {
                errors.push(item.typeCode);
            }
        });
    }
    return { isTemporal, errors };
};

export const fixNegativeOrDecimalValue = (value: number): number =>
    // tslint:disable-next-line
    value === NaN || value < 0 ? 0 : Math.round(value);
