import * as moment from 'moment';
import { GanttBar } from './gantt-item-execution.model';

export interface GanttItemMultiProject {
  id: number;
  externalCode: string;
  description: string;
  level: number;
  typeCode: string;
  name: string;
  parent: number;
  childrenIdList: number[];
  order: number;
  isActive: boolean;
  isMilestone: boolean;
  weight: number;
  progress: number;
  mapStartDate: moment.Moment | null;
  mapEndDate: moment.Moment | null;
  actualStartDate: moment.Moment | null;
  actualEndDate: moment.Moment | null;
  forecastStartDate: moment.Moment | null;
  forecastEndDate: moment.Moment | null;
  baselineStartDate: moment.Moment | null;
  baselineEndDate: moment.Moment | null;
  lastReauthEndDate: moment.Moment | null;
  lastReauthStartDate: moment.Moment | null;
  collapsed?: boolean;
  collapsable?: boolean;
  visible?: boolean;
}

export type ItemsMap = Map<number, GanttItemMultiProject>;

export interface GanttTaskBars {
  id: number;
  gridStartDate: moment.Moment;
  lastReauthBar: GanttBar;
  actualBar: GanttBar;
  forecastBar: GanttBar;
}
