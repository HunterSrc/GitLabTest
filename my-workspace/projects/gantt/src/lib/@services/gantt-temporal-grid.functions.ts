import * as moment from 'moment';
import {
    getMinDate,
    getMaxDate,
    MtDate
} from './gantt-execution-rollup.functions';
import { ItemsMap } from '../@model/gantt-item-temporal.model';
import * as executionFn from './gantt-execution-grid.functions';

export function getGridHeader(itemsMap: ItemsMap): string[] {
    const startNormalized = getStartDate(itemsMap);
    const end = getMaxDate(
        ...[...itemsMap.values()]
            .map((item) => item.baselineEndDate as moment.Moment)
            .filter((item) => item?.isValid())
    );
    const endNormalized = end && moment(end).startOf('month');
    const monthsDuration =
        endNormalized?.diff(startNormalized, 'months') + 2 || 24;
    return new Array(monthsDuration)
        .fill(1)
        .map((val, index) =>
            startNormalized.add(!!index && val, 'months').format('MM/YY')
        );
}

export function getStartDate(itemsMap: ItemsMap): MtDate {
    const start = getMinDate(
        ...[...itemsMap.values()]
            .map((item) => item.baselineStartDate as moment.Moment)
            .filter((item) => item?.isValid())
    );
    return (
        (start && moment(start).startOf('month')) || moment().startOf('month')
    );
}

export function resolveProjectDates(commissionId: number, map: ItemsMap): void {
    const commission = { ...map.get(commissionId) };
    const startBaseline = commission.childrenIdList
        .map((id) => map.get(id))
        .filter((i) => i && i.isActive)
        .map((i) => i.baselineStartDate as moment.Moment)
        .filter((d) => d?.isValid());
    if (!startBaseline.length) {
        startBaseline.push(getStartDate(map));
    }
    const endBaseline = commission.childrenIdList
        .map((id) => map.get(id))
        .filter((i) => i && i.isActive)
        .map((i) => i.baselineEndDate as moment.Moment)
        .filter((d) => d?.isValid());
    if (startBaseline.length && endBaseline.length) {
        commission.baselineStartDate = moment(getMinDate(...startBaseline));
        commission.baselineEndDate = moment(getMaxDate(...endBaseline));
        map.set(commission.id, commission);
    }
}

export const calculateBar = executionFn.calculateBar;
