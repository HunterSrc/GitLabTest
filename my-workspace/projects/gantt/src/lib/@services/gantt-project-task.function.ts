import * as moment from 'moment';
import {
    DateType,
    GanttItem,
    ItemsMap
} from '../@model/gantt-item-project.model';
import {
    getMaxDate,
    getMinDate,
    MtDate
} from './gantt-execution-rollup.functions';

export function getGridHeader(map: ItemsMap): string[] {
    const items = [...map.values()];
    const startDates = [
        ...items.map((item) => item.mapStartDate as MtDate),
        ...items.map((item) => item.plannedStartDate.value as MtDate)
    ];
    const endDates = [
        ...items.map((item) => item.mapEndDate as MtDate),
        ...items.map((item) => item.plannedEndDate.value as MtDate)
    ];
    const start = getMinDate(...startDates.filter((d) => !!d && d.isValid()));
    const end = getMaxDate(...endDates.filter((d) => !!d && d.isValid()));
    if (start?.isValid() && end?.isValid()) {
        const startNormalized = moment(start).startOf('month');
        const endNormalized = moment(end).endOf('month');
        const monthsDuration =
            endNormalized.diff(startNormalized, 'months') + 2;
        return new Array(monthsDuration)
            .fill(1)
            .map((val, index) =>
                startNormalized.add(!!index && val, 'months').format('MM/YY')
            );
    }
    return new Array(24).fill(1).map((val, index) =>
        moment()
            .startOf('month')
            .add(!!index && val, 'months')
            .format('MM/YY')
    );
}

export function getStartDate(project: GanttItem): MtDate {
    return moment(project.mapStartDate).isValid() &&
        moment(project.plannedStartDate?.value).isValid()
        ? getMinDate(
              moment(project.mapStartDate),
              moment(project.plannedStartDate?.value)
          )
        : moment().startOf('month');
}

export const getMinStartDate = (items: GanttItem[]): moment.Moment => {
    const dates = items
        .filter((item) => !!item.isActive)
        .map((item) => moment(item.plannedStartDate?.value))
        .filter((date) => date?.isValid());

    return getMinDate(...dates);
};

export function getEndDate(project: GanttItem): MtDate {
    return moment(project.mapEndDate).isValid() &&
        moment(project.plannedEndDate?.value).isValid()
        ? getMaxDate(
              moment(project.mapEndDate),
              moment(project.plannedEndDate?.value)
          )
        : moment().endOf('month');
}

export function resolveProjectDates(
    projectId: number,
    map: ItemsMap,
    isUnderReauth = false,
    isFirstVersion = true
): void {
    let project: GanttItem = map.get(projectId);
    const phaseList: GanttItem[] = [...map.values()]
        .filter((item) => item.typeCode !== 'RESTORATIONS')
        .filter((item) => item.id !== projectId)
        .filter((item) => item.isActive === true);
    const startDateMap: DateType = moment(
        getMinDate(
            ...phaseList
                .map((item) => item.mapStartDate as moment.Moment)
                .filter((d) => d?.isValid())
        )
    );
    const endDateMap: DateType = moment(
        getMaxDate(
            ...phaseList
                .map((item) => item.mapEndDate as moment.Moment)
                .filter((d) => d?.isValid())
        )
    );
    const startDatePlanned: DateType = moment(
        getMinDate(
            ...phaseList
                .map((item) => item.plannedStartDate?.value as moment.Moment)
                .filter((d) => d?.isValid())
        )
    );
    const endDatePlanned: DateType = moment(
        getMaxDate(
            ...phaseList
                .map((item) => item.plannedEndDate?.value as moment.Moment)
                .filter((d) => d?.isValid())
        )
    );
    project = {
        ...project,
        mapStartDate:
            isUnderReauth && !isFirstVersion
                ? project.mapStartDate
                : startDateMap,
        mapEndDate:
            isUnderReauth && !isFirstVersion ? project.mapEndDate : endDateMap,
        plannedStartDate: {
            value: startDatePlanned,
            editable: !!project.plannedStartDate?.editable
        },
        plannedEndDate: {
            value: endDatePlanned,
            editable: !!project.plannedEndDate?.editable
        }
    };
    map.set(projectId, project);
}

export const getProject = (items: GanttItem[]): GanttItem =>
    items.find((item) => item.level === 0);

export const toMap = (input: GanttItem[]): ItemsMap =>
    new Map(input.map((item) => [item.id, item]));
