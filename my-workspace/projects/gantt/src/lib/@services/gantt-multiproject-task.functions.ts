import * as moment from 'moment';
import {
  GanttItemMultiProject,
  ItemsMap
} from '../@model/gantt-item-multiproject.model';
import { DateType } from '../@model/gantt-item-project.model';
import { TypeCodeEnum } from '../@model/type-code.enum';
import { MtDate } from './gantt-execution-rollup.functions';

export const getMinDate = (...dates: MtDate[]): MtDate =>
  dates.reduce((p: MtDate, c: MtDate) => (p?.isBefore(c) ? p : c), dates[0]);

export const getMaxDate = (...dates: MtDate[]): MtDate =>
  dates.reduce((p: MtDate, c: MtDate) => (p?.isAfter(c) ? p : c), dates[0]);

export const isBatch = (item: GanttItemMultiProject): boolean =>
  TypeCodeEnum.BATCH === TypeCodeEnum[item?.typeCode];

export const isBatchClosable = (item: GanttItemMultiProject): boolean =>
  isBatch(item) && !item.actualEndDate?.isValid() && item.progress <= 100;

export const closeBatch = (itemId: number, map: ItemsMap): void => {
  const item = map.get(itemId);
  if (item) {
    const _item = { ...item };
    _item.actualEndDate = moment();
    _item.progress = 100;
    map.set(itemId, _item);
  }
};

export const hide = <T extends GanttItemMultiProject>(
  itemId: number,
  map: Map<number, T>
): void => {
  const item = map.get(itemId);
  if (item) {
    const _item = { ...item };
    _item.collapsed = false;
    _item.visible = false;
    _item.childrenIdList.forEach((id) => hide(id, map));
    map.set(itemId, _item);
  }
};

export const collapseAll = <T extends GanttItemMultiProject>(
  map: Map<number, T>
): void => {
  Array.from(map.keys()).forEach((key) => {
    const item = map.get(key);
    if (item && item.collapsable) {
      const _item = { ...item };
      _item.collapsed = false;
      _item.childrenIdList.forEach((id) => hide(id, map));
      _item.collapsable = isItemCollapsable(item as GanttItemMultiProject);
      map.set(item.id, _item);
    }
  });
};

export const sort = <T extends GanttItemMultiProject>(
  items: T[],
  projectId: number,
  map: Map<number, T>
): T[] => {
  const project: T = map.get(projectId);
  if (project) {
    return spreadItem(project, map || toMap(items), [project]);
  }
};

export const spreadItem = <T extends GanttItemMultiProject>(
  item: T,
  map: Map<number, T>,
  accumulator: T[] = []
): T[] =>
  item?.childrenIdList?.length
    ? item.childrenIdList
        ?.map((childId) => map.get(childId))
        ?.sort((a, b) => a.order - b.order)
        ?.reduce(
          (acc, current) => [...acc, current, ...spreadItem(current, map)],
          [...accumulator]
        )
    : [...accumulator];

export const toggleCollapse = <T extends GanttItemMultiProject>(
  itemId: number,
  map: Map<number, T>
): void => {
  const item = map.get(itemId);
  if (item && item.collapsable) {
    const _item = { ...item };
    if (item.collapsed) {
      _item.collapsed = false;
      _item.childrenIdList.forEach((id) => hide(id, map));
    } else {
      _item.collapsed = true;
      _item.childrenIdList.forEach((id) => {
        if (map.has(id)) {
          map.get(id).visible = true;
          map.get(id).childrenIdList.forEach((childId) => hide(childId, map));
        }
      });
    }
    map.set(itemId, _item);
  }
};

const setActivation = <T extends GanttItemMultiProject>(
  itemId: number,
  map: Map<number, T>,
  value: boolean
): void => {
  const item = map.get(itemId);
  if (item?.level > 1) {
    const _item = { ...item };
    _item.isActive = value;
    _item.childrenIdList.forEach((id) => setActivation(id, map, value));
    map.set(itemId, _item);
  }
};

export const toggleActivation = <T extends GanttItemMultiProject>(
  itemId: number,
  map: Map<number, T>
): void => {
  const item = map.get(itemId);
  if (item) {
    setActivation(item.id, map, !item.isActive);
  }
};

const forbiddenTypeCodes = new Set([
  'PUB_AUTHORIZATIONS',
  'PRI_AUTHORIZATIONS',
  'CONTRACT'
]);
const isItemCollapsable = (item: GanttItemMultiProject): boolean =>
  !!item.childrenIdList?.length && !forbiddenTypeCodes.has(item.typeCode);

export function getGridHeader(map: ItemsMap): string[] {
  const items = [...map.values()];
  const startDates = [
    ...items.map((item) => item.actualStartDate as MtDate),
    ...items.map((item) => item.forecastStartDate as MtDate),
    ...items.map((item) => item.baselineStartDate as MtDate)
  ];
  const endDates = [
    ...items.map((item) => item.actualEndDate as MtDate),
    ...items.map((item) => item.forecastEndDate as MtDate),
    ...items.map((item) => item.baselineEndDate as MtDate)
  ];
  const start = getMinDate(...startDates.filter((d) => !!d && d.isValid()));
  const end = getMaxDate(...endDates.filter((d) => !!d && d.isValid()));
  if (start?.isValid() && end?.isValid()) {
    const startNormalized = moment(start).startOf('month');
    const endNormalized = moment(end).endOf('month');
    const monthsDuration = endNormalized.diff(startNormalized, 'months') + 2;
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

export function getStartDate(project: GanttItemMultiProject): MtDate {
  return moment(project.baselineStartDate).isValid() &&
    moment(project.forecastStartDate).isValid()
    ? getMinDate(
        moment(project.baselineStartDate),
        moment(project.forecastStartDate)
      )
    : moment().startOf('month');
}

export function getEndDate(project: GanttItemMultiProject): MtDate {
  return moment(project.baselineEndDate).isValid() &&
    moment(project.forecastEndDate).isValid()
    ? getMaxDate(
        moment(project.baselineEndDate),
        moment(project.forecastEndDate)
      )
    : moment().endOf('month');
}

export function resolveProjectDates(projectId: number, map: ItemsMap): void {
  let project: GanttItemMultiProject = map.get(projectId);
  const phaseList: GanttItemMultiProject[] = [...map.values()]
    .filter((item) => item.typeCode !== 'RESTORATIONS')
    .filter((item) => item.id !== projectId);
  const startDateMap: DateType = moment(
    getMinDate(...phaseList.map((item) => item.mapStartDate as moment.Moment))
  );
  const endDateMap: DateType = moment(
    getMaxDate(...phaseList.map((item) => item.mapEndDate as moment.Moment))
  );
  project = {
    ...project,
    mapStartDate: startDateMap,
    mapEndDate: endDateMap
  };
  map.set(projectId, project);
}

export const getProject = (
  items: GanttItemMultiProject[]
): GanttItemMultiProject => items.find((item) => item.level === 0);

export const toMap = <T extends GanttItemMultiProject>(
  items: T[]
): Map<number, T> =>
  new Map(items.filter((i) => !!i).map((item: T) => [item.id, { ...item }]));
