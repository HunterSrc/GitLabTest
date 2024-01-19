import * as moment from 'moment';
import { GanttModifiedRowDto } from 'projects/epms-main/src/app/@services/dtos/gantt.dto';
import {
  GanttProjectItem,
  ProjectDates
} from 'projects/epms-main/src/app/@services/dtos/progetto/progetto.detail.dto';
import { GanttRow } from 'projects/epms-main/src/app/@state/gantt.state';
import { toMap as toMapAtemporal } from '../@services/gantt-atemporal-task.functions';
import { toMap as toMapExecution } from '../@services/gantt-execution-task.functions';
import { toMap as toMapTemporal } from '../@services/gantt-temporal-task.functions';
import {
  GanttItemAtemporal,
  ItemsMap as AtemporalMap
} from './gantt-item-atemporal.model';
import {
  GanttItemExecution,
  ItemsMap as ExecutionMap,
  ItemUpdater
} from './gantt-item-execution.model';
import { GanttItemMultiProject } from './gantt-item-multiproject.model';
import { DateType } from './gantt-item-project.model';
import {
  GanttItemTemporal,
  ItemsMap as TemporalMap
} from './gantt-item-temporal.model';
import { TypeCodeUnion } from './type-code.enum';

type AtemporalInput = { ganttRows: GanttItemAtemporal[] };
type TemporalInput = { ganttRows: GanttItemTemporal[] };
type ExecutionInput = { ganttRows: GanttItemExecution[] };

export const isMoment = (value: DateType): value is moment.Moment =>
  !!value && (value as moment.Moment).daysInMonth !== undefined;
export const stringifyDate = (date: DateType): string =>
  isMoment(date) && date?.isValid() ? date.format('YYYY-MM-DD') : null;
export const stringToDate = (date: string): Date =>
  date ? moment(date, 'YYYY-MM-DD').toDate() : null;
export const stringToMoment = (date: string): moment.Moment =>
  date && moment(date, 'YYYY-MM-DD').isValid()
    ? moment(date, 'YYYY-MM-DD')
    : null;

export const atemporalRowToModifiedRow = (
  source: GanttItemAtemporal
): GanttModifiedRowDto => ({
  ...source,
  mapStartDate: stringifyDate(source.mapStartDate),
  mapEndDate: stringifyDate(source.mapEndDate)
});

export const mapAtemporalRow = (source: GanttItemAtemporal): GanttRow => ({
  ...source,
  mapStartDate: moment(source.mapStartDate),
  mapEndDate: moment(source.mapEndDate)
});

export const temporalRowToModifiedRow = (
  source: GanttItemTemporal
): GanttModifiedRowDto => ({
  ...source,
  mapStartDate: stringifyDate(source.mapStartDate),
  mapEndDate: stringifyDate(source.mapEndDate),
  baselineStartDate: stringifyDate(source.baselineStartDate),
  baselineEndDate: stringifyDate(source.baselineEndDate)
});

export const mapTemporalRow = (source: GanttItemTemporal): GanttRow => ({
  ...source,
  mapStartDate: moment(source.mapStartDate),
  mapEndDate: moment(source.mapEndDate),
  baselineStartDate: moment(source.baselineStartDate),
  baselineEndDate: moment(source.baselineEndDate)
});

export const executionRowToModifiedRow = (
  source: GanttItemExecution
): GanttModifiedRowDto => ({
  ...source,
  baselineStartDate: stringifyDate(source.baselineStartDate),
  baselineEndDate: stringifyDate(source.baselineEndDate),
  actualStartDate: stringifyDate(source.actualStartDate),
  actualEndDate: stringifyDate(source.actualEndDate),
  forecastStartDate: stringifyDate(source.forecastStartDate),
  forecastEndDate: stringifyDate(source.forecastEndDate),
  mapStartDate: stringifyDate(source.mapStartDate),
  mapEndDate: stringifyDate(source.mapEndDate),
  lastReauthStartDate: stringifyDate(source.lastReauthStartDate),
  lastReauthEndDate: stringifyDate(source.lastReauthEndDate)
});

export const mapExecutionRow = (source: GanttItemExecution): GanttRow => ({
  ...source,
  baselineStartDate: moment(source.baselineStartDate),
  baselineEndDate: moment(source.baselineEndDate),
  actualStartDate: moment(source.actualStartDate),
  actualEndDate: moment(source.actualEndDate),
  forecastStartDate: moment(source.forecastStartDate),
  forecastEndDate: moment(source.forecastEndDate),
  mapStartDate: moment(source.mapStartDate),
  mapEndDate: moment(source.mapEndDate),
  lastReauthStartDate: moment(source.lastReauthStartDate),
  lastReauthEndDate: moment(source.lastReauthEndDate)
});

export const ganttRowToUpdater = (source: GanttRow): ItemUpdater => ({
  id: source.id,
  progress: source.progress,
  weight: source.weight,
  actualStartDate: source.actualStartDate?.toDate() || null,
  actualEndDate: source.actualEndDate.toDate() || null,
  forecastStartDate: source.forecastStartDate?.toDate() || null,
  forecastEndDate: source.forecastEndDate?.toDate() || null,
  baselineStartDate: source.baselineStartDate?.toDate() || null,
  baselineEndDate: source.baselineEndDate?.toDate() || null,
  startMonth: source.startMonth,
  duration: source.duration,
  lastReauthStartDate: source.lastReauthStartDate?.toDate() || null,
  lastReauthEndDate: source.lastReauthEndDate?.toDate() || null,
  mapStartDate: source.mapStartDate?.toDate() || null,
  mapEndDate: source.mapEndDate.toDate() || null,
  isActive: source.isActive
});

export const applyUpdaterExecution = (
  source: GanttItemExecution,
  updater: ItemUpdater
): GanttItemExecution => {
  const item = { ...source };

  item.actualStartDate =
    updater.actualStartDate != null ? moment(updater.actualStartDate) : null;
  item.actualEndDate =
    updater.actualEndDate != null ? moment(updater.actualEndDate) : null;
  if (item.level <= 2) {
    item.baselineStartDate =
      updater.baselineStartDate != null
        ? moment(updater.baselineStartDate)
        : null;
    item.baselineEndDate =
      updater.baselineEndDate != null ? moment(updater.baselineEndDate) : null;
    item.forecastStartDate =
      updater.forecastStartDate != null
        ? moment(updater.forecastStartDate)
        : null;
    item.forecastEndDate =
      updater.forecastEndDate != null ? moment(updater.forecastEndDate) : null;
    item.startMonth = updater.startMonth;
    item.duration = updater.duration;
    item.mapStartDate =
      (updater.mapStartDate && moment(updater.mapStartDate)) ||
      item.mapStartDate;
    item.mapEndDate =
      (updater.mapEndDate && moment(updater.mapEndDate)) || item.mapEndDate;
    item.lastReauthStartDate =
      (updater.lastReauthStartDate && moment(updater.lastReauthStartDate)) ||
      item.lastReauthStartDate;
    item.lastReauthEndDate =
      (updater.lastReauthEndDate && moment(updater.lastReauthEndDate)) ||
      item.lastReauthEndDate;
  }
  item.weight = updater.weight != null ? updater.weight : item.weight;
  item.progress = updater.progress != null ? updater.progress : item.progress;
  item.isActive = updater.isActive;
  return item;
};

export const applyUpdaterTemporal = (
  source: GanttItemTemporal,
  updater: ItemUpdater
): GanttItemTemporal => {
  const item = { ...source };
  item.baselineStartDate =
    (updater.baselineStartDate && moment(updater.baselineStartDate)) ||
    item.baselineStartDate;
  item.baselineEndDate =
    (updater.baselineEndDate && moment(updater.baselineEndDate)) ||
    item.baselineEndDate;
  item.weight = (updater.weight != null && updater.weight) || item.weight;
  item.progress =
    (updater.progress != null && updater.progress) || item.progress;
  item.startMonth = updater.startMonth;
  item.duration = updater.duration;
  return item;
};

export const modifiedRowsToAtemporalGantt = (
  modifiedRows: GanttRow[],
  gantt: AtemporalInput
): AtemporalInput => {
  const itemsMap: AtemporalMap = toMapAtemporal([...(gantt?.ganttRows || [])]);
  modifiedRows.forEach((row) => {
    const mapItem = itemsMap.get(row.id);
    if (mapItem) {
      const item = { ...mapItem };
      item.duration = row.duration;
      item.startMonth = row.startMonth;
      item.isActive = row.isActive;
      item.typeCode = row.typeCode as TypeCodeUnion;
      item.parent = row.parent;
      item.mapStartDate =
        (row.mapStartDate && moment(row.mapStartDate)) || item.mapStartDate;
      item.mapEndDate =
        (row.mapEndDate && moment(row.mapEndDate)) || item.mapEndDate;
      itemsMap.set(item.id, item);
    }
  });
  return { ganttRows: [...itemsMap.values()] };
};

export const modifiedRowsToExecutionGantt = (
  modifiedRows: GanttRow[],
  gantt: ExecutionInput
): ExecutionInput => {
  const itemsMap: ExecutionMap = toMapExecution([...(gantt?.ganttRows || [])]);
  modifiedRows.forEach((row) => {
    const mapItem = itemsMap.get(row.id);
    if (mapItem) {
      const item = { ...mapItem };
      item.duration = row.duration;
      item.startMonth = row.startMonth;
      item.isActive = row.isActive;
      item.actualStartDate = moment(row.actualStartDate);
      item.actualEndDate = moment(row.actualEndDate);
      item.baselineStartDate = moment(row.baselineStartDate);
      item.baselineEndDate = moment(row.baselineEndDate);
      item.forecastStartDate = moment(row.forecastStartDate);
      item.forecastEndDate = moment(row.forecastEndDate);
      item.weight = row.weight;
      item.progress = row.progress;
      item.typeCode = row.typeCode as TypeCodeUnion;
      item.parent = row.parent;
      item.mapStartDate = moment(row.mapStartDate);
      item.mapEndDate = moment(row.mapEndDate);
      item.lastReauthStartDate = moment(row.lastReauthStartDate);
      item.lastReauthEndDate = moment(row.lastReauthEndDate);
      itemsMap.set(item.id, item);
    }
  });
  return { ganttRows: [...itemsMap.values()] };
};

export const modifiedRowsToTemporalGantt = (
  modifiedRows: GanttRow[],
  gantt: TemporalInput
): TemporalInput => {
  const itemsMap: TemporalMap = toMapTemporal([...(gantt?.ganttRows || [])]);
  modifiedRows.forEach((row) => {
    const mapItem = itemsMap.get(row.id);
    if (mapItem) {
      const item = { ...mapItem };
      item.duration = row.duration;
      item.startMonth = row.startMonth;
      item.isActive = row.isActive;
      item.baselineStartDate = moment(row.baselineStartDate);
      item.baselineEndDate = moment(row.baselineEndDate);
      item.weight = row.weight;
      item.progress = row.progress;
      item.typeCode = row.typeCode as TypeCodeUnion;
      item.parent = row.parent;
      item.mapStartDate = moment(row.mapStartDate);
      item.mapEndDate = moment(row.mapEndDate);
      itemsMap.set(item.id, item);
    }
  });
  return { ganttRows: [...itemsMap.values()] };
};

export const modifiedRowsToMultiProjectGantt = (
  modifiedRows: GanttRow[],
  gantt: ExecutionInput
): ExecutionInput => {
  const itemsMap: ExecutionMap = toMapExecution([...(gantt?.ganttRows || [])]);
  modifiedRows.forEach((row) => {
    const mapItem = itemsMap.get(row.id);
    if (mapItem) {
      const item = { ...mapItem };
      item.duration = row.duration;
      item.startMonth = row.startMonth;
      item.isActive = row.isActive;
      item.actualStartDate = moment(row.actualStartDate);
      item.actualEndDate = moment(row.actualEndDate);
      item.baselineStartDate = moment(row.baselineStartDate);
      item.baselineEndDate = moment(row.baselineEndDate);
      item.forecastStartDate = moment(row.forecastStartDate);
      item.forecastEndDate = moment(row.forecastEndDate);
      item.weight = row.weight;
      item.progress = row.progress;
      item.typeCode = row.typeCode as TypeCodeUnion;
      item.parent = row.parent;
      item.mapStartDate = moment(row.mapStartDate);
      item.mapEndDate = moment(row.mapEndDate);
      item.lastReauthStartDate = moment(row.lastReauthStartDate);
      item.lastReauthEndDate = moment(row.lastReauthEndDate);
      itemsMap.set(item.id, item);
    }
  });
  return { ganttRows: [...itemsMap.values()] };
};

export const applyUpdaterMultiProject = (
  source: GanttItemMultiProject,
  updater: ItemUpdater
): GanttItemMultiProject => {
  const item = { ...source };

  item.actualStartDate =
    (!!updater.actualStartDate && moment(updater.actualStartDate)) || null;
  item.actualEndDate =
    (!!updater.actualEndDate && moment(updater.actualEndDate)) || null;
  if (item.level <= 2) {
    item.baselineStartDate =
      (!!updater.baselineStartDate && moment(updater.baselineStartDate)) ||
      null;
    item.baselineEndDate =
      (!!updater.baselineEndDate && moment(updater.baselineEndDate)) || null;
    item.forecastStartDate =
      (!!updater.forecastStartDate && moment(updater.forecastStartDate)) ||
      null;
    item.forecastEndDate =
      (!!updater.forecastEndDate && moment(updater.forecastEndDate)) || null;
    item.mapStartDate =
      (!!updater.mapStartDate && moment(updater.mapStartDate)) ||
      item.mapStartDate;
    item.mapEndDate =
      (!!updater.mapEndDate && moment(updater.mapEndDate)) || item.mapEndDate;
  }
  item.weight = (updater.weight != null && updater.weight) || item.weight;
  item.progress = updater.progress != null ? updater.progress : item.progress;
  return item;
};

export const projectMapItemMapper = (
  input: GanttProjectItem<moment.Moment>
): GanttItemAtemporal => ({
  id: input.id,
  name: input.name,
  externalCode: input.externalCode,
  description: input.description,
  weight: 20,
  typeCode: input.typeCode as TypeCodeUnion,
  parent: input.parent,
  level: input.level,
  startMonth: input.startMonth,
  duration: input.duration,
  isActive: !!input.isActive,
  isMilestone: !!input.isMilestone,
  order: input.order,
  childrenIdList: [],
  subjectDetail: null,
  mapStartDate: input.mapStartDate ? moment(input.mapStartDate) : null,
  mapEndDate: input.mapStartDate ? moment(input.mapEndDate) : null
});

export const mapAtemporalRows = (
  input: GanttRow[]
): ProjectDates<moment.Moment>[] => {
  const fnMapper = (_input: GanttRow): ProjectDates<moment.Moment> => ({
    id: _input.id,
    plannedStartDate: null,
    plannedEndDate: null,
    mapStartDate: _input.mapStartDate?.isValid()
      ? moment(_input.mapStartDate)
      : null,
    mapEndDate: _input.mapEndDate?.isValid() ? moment(_input.mapEndDate) : null,
    duration: _input.duration,
    startMonth: _input.startMonth,
    typeCode: _input.typeCode,
    level: _input.level,
    isActive: _input.isActive,
    isMilestone: _input.isMilestone
  });
  return input.map(fnMapper);
};
