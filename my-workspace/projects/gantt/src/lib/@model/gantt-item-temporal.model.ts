import * as moment from 'moment';
import { DateType } from './gantt-item-project.model';
import { TypeCodeUnion } from './type-code.enum';

export interface GanttItemTemporalBase {
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
  mapStartDate: DateType;
  mapEndDate: DateType;
  order?: number;
  duration?: number;
  startMonth?: number;
  isMilestone?: boolean;
  isActive?: boolean;
}

export interface GanttItemTemporal extends GanttItemTemporalBase {
  visible?: boolean;
  collapsed?: boolean;
  collapsable?: boolean;
}

export interface GanttTemporalBar {
  dateStart: moment.Moment;
  dateEnd: moment.Moment;
  end: number;
  start: number;
  color: string;
}

const convertDate = (date: DateType): moment.Moment | null =>
  (!!date && moment(date)) || null;

export const ganttItemTemporalMapper = (
  source: GanttItemTemporalBase
): GanttItemTemporal => ({
  ...source,
  baselineStartDate: convertDate(source.baselineStartDate),
  baselineEndDate: convertDate(source.baselineEndDate),
  mapStartDate: convertDate(source.mapStartDate),
  mapEndDate: convertDate(source.mapEndDate),
  visible: true,
  collapsed: true,
  collapsable: source.level > 1 && !!source.childrenIdList?.length
});

export type ItemsMap = Map<number, GanttItemTemporal>;
