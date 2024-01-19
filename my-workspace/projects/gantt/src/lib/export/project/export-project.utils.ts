import * as moment from 'moment';
import { GanttItem } from '../../@model/gantt-item-project.model';
import { Activity } from '../pagination.utils';

export interface Intervals {
  map: number[];
  todo: number[];
  done: number[];
  planned?: number[];
}

export interface GanttRow extends Intervals {
  externalCode: string;
  isActive: boolean;
  isMilestone: boolean;
  delay: number;
  progress: number;
  duration: number;
  hasActualStartDate: boolean;
}

const getEnd = (input: number[]): number => input[0] + input[1];

export const getGanttRowLimit = (input: GanttRow) =>
  Math.max(getEnd(input.map), getEnd(input.planned));

export const shiftIntervals = <T extends Intervals>(
  input: T,
  delta = 0
): T => ({
  ...input,
  map: [input.map[0] + delta, input.map[1]],
  planned: [input.planned[0] + delta, input.planned[1]],
  todo: [input.todo[0] + delta, input.todo[1]],
  done: [input.done[0] + delta, input.done[1]]
});

export const getIntervals = (
  item: GanttItem,
  gridStart: moment.Moment
): Intervals => {
  const gridStartNormalized = moment(gridStart).startOf('month');
  const startDateMap = normalizeDate(moment(item.mapStartDate)).startOf(
    'month'
  );
  const endDateMap = normalizeDate(moment(item.mapEndDate)).startOf('month');
  const startDatePlanned = normalizeDate(
    moment(item.plannedStartDate?.value)
  ).startOf('month');
  const endDatePlanned = normalizeDate(
    moment(item.plannedEndDate?.value)
  ).startOf('month');

  const mapStart = startDateMap.isValid()
    ? moment(startDateMap).diff(gridStartNormalized, 'months')
    : 0;
  const plannedStart = startDatePlanned.isValid()
    ? moment(startDatePlanned).diff(gridStartNormalized, 'months')
    : 0;
  // Normalize the planned date as today
  const todoStart = (
    !item.hasActualStartDate && item.progress === 0
      ? adjustNotStartedBar(item?.plannedStartDate?.value as moment.Moment)
      : normalizeToday()
  ).diff(gridStartNormalized, 'months');
  const doneStart = plannedStart;
  const mapDiffDate = moment(endDateMap).diff(startDateMap, 'months');
  const plannedDiffDate = moment(endDatePlanned).diff(
    startDatePlanned,
    'months'
  );
  const mapDuration =
    endDateMap.isValid() && startDateMap.isValid()
      ? mapDiffDate > 0
        ? mapDiffDate
        : 1
      : 0;

  const plannedDuration =
    endDatePlanned.isValid() && startDatePlanned.isValid()
      ? plannedDiffDate > 0
        ? plannedDiffDate
        : 1
      : 0;

  // #if progress === 0
  let todoDuration = plannedDuration;
  let doneDuration = 0;

  if (item.progress === 100) {
    todoDuration = 0;
    doneDuration = plannedDuration;
  } else if (!!item.progress || !!item.hasActualStartDate) {
    todoDuration = plannedDuration + plannedStart - todoStart;
    doneDuration = plannedDuration - todoDuration;
  }
  return {
    map: [mapStart, mapDuration],
    planned: [plannedStart, plannedDuration],
    todo: [todoStart, todoDuration],
    done: [doneStart, doneDuration]
  };
};

const normalizeDate = (date: moment.Moment): moment.Moment =>
  (moment(date).date() > 15
    ? moment(date).add(1, 'months')
    : moment(date)
  ).startOf('month');

const normalizeToday = (): moment.Moment => normalizeDate(moment());

const adjustNotStartedBar = (date: moment.Moment): moment.Moment =>
  date?.isValid() && date.format('DD/MM/YYYY') !== moment().format('DD/MM/YYYY')
    ? normalizeDate(moment(date))
    : normalizeToday();

export const getTodayIntervals = (gridStart: moment.Moment): Intervals => {
  const gridStartNormalized = moment(gridStart).startOf('month');
  const date = normalizeToday().diff(gridStartNormalized, 'months');
  return {
    map: [date, 1],
    planned: [date, 1],
    todo: [date, 1],
    done: [date, 1]
  };
};

export const getMapActivity = (input: GanttRow): Activity => ({
  startMonth: input.map[0],
  duration: input.map[1],
  isActive: !!input.isActive,
  isMilestone: !!input.isMilestone
});

export const getTodoActivity = (input: GanttRow): Activity => ({
  startMonth: input.todo[0],
  duration: input.todo[1],
  isActive: !!input.isActive,
  isMilestone: !!input.isMilestone
});

export const getDoneActivity = (input: GanttRow): Activity => ({
  startMonth: input.done[0],
  duration: input.done[1],
  isActive: !!input.isActive,
  isMilestone: !!input.isMilestone
});
