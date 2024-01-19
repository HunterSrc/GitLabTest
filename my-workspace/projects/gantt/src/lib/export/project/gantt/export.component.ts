import { AfterViewInit, Component, Input } from '@angular/core';
import { GanttRow } from '../export-project.utils';

type Color = 'green' | 'red' | 'yellow';

const MONTH_WIDTH = 7;
const GANTT_START_X = 42;
const MILESTONE_START_X = 49;

const getRectStartX = (phasePage: number[]): number =>
  phasePage?.length > 0 ? GANTT_START_X + MONTH_WIDTH * (phasePage[0] - 1) : 0;
const getMilestoneX = (phasePage: number[]): number =>
  phasePage?.length > 0 ? MILESTONE_START_X + MONTH_WIDTH * phasePage[0] : 0;
const getRectWidth = (phasePage: number[]): number =>
  MONTH_WIDTH * calculateDuration(phasePage);
const calculateDuration = (phase: number[]): number =>
  phase?.length > 1 && !!phase[1] && !!phase[0] && phase[1] > phase[0]
    ? phase[1] - phase[0]
    : 0;

const getRectStartXByColor = (row: GanttRow, color: Color): number => {
  switch (color) {
    case 'green':
      return getRectStartX(row.map);
    case 'yellow':
      return getRectStartX(row.done);
    case 'red':
      return getRectStartX(row.todo);
    default:
      return -1;
  }
};

const getRectWidthByColor = (row: GanttRow, color: Color): number => {
  switch (color) {
    case 'green':
      return getRectWidth(row.map);
    case 'yellow':
      return getRectWidth(row.done);
    case 'red':
      return getRectWidth(row.todo);
    default:
      return -1;
  }
};

const getPaddedString = (duration: number): string =>
  duration > 9 ? `${duration}` : ` ${duration}`;

@Component({
  selector: 'lib-export-project',
  templateUrl: './export.component.html'
})
export class GanttTemporalExportComponent implements AfterViewInit {
  @Input() private date;
  @Input() private currentPage;
  @Input() private pageMap: Map<string, GanttRow>;
  @Input() private projectName: string;
  @Input() private projectCode: string;
  @Input() private maker: string;
  @Input() private timePrecision: string;
  @Input() private startYear: number;

  constructor() {}

  ngAfterViewInit(): void {}

  private getPageValues = (key: string) => this.pageMap?.get(key);

  getProjectName = (): string =>
    this.projectName.length < 100
      ? this.projectName
      : `${this.projectName.substring(0, 97)}...`;
  getProjectNumber = (): string => this.projectCode;

  getMaker = (): string => this.maker;
  getDate = (): string => this.date;
  getTimePrecision = (): string => this.timePrecision;

  getProjectDuration = (): number =>
    this.pageMap.get(this.projectCode).duration;
  getProjectDelay = (): number => this.pageMap.get(this.projectCode).delay;

  getProjectPage = (): GanttRow => this.getPageValues(this.projectCode);
  getIngegneriaPage = (): GanttRow => this.getPageValues('ING');
  getPermessiPage = (): GanttRow => this.getPageValues('PS');
  getProcurementMaterialiPage = (): GanttRow => this.getPageValues('MAT');
  getProcurementLavoriPage = (): GanttRow => this.getPageValues('PL');
  getCostruzionePage = (): GanttRow => this.getPageValues('COS');
  getRispristiniPage = (): GanttRow => this.getPageValues('RP');
  getMessaInEsercizioPage = (): GanttRow => this.getPageValues('EE');

  getStartTargetDaMap = (color: Color): number =>
    getRectStartXByColor(this.getProjectPage(), color);
  getWidthTargetDaMap = (color: Color): number =>
    getRectWidthByColor(this.getProjectPage(), color);

  getStartIngegneria = (color: Color): number =>
    getRectStartXByColor(this.getIngegneriaPage(), color);
  getWidthIngegneria = (color: Color): number =>
    getRectWidthByColor(this.getIngegneriaPage(), color);

  getStartPermessi = (color: Color): number =>
    getRectStartXByColor(this.getPermessiPage(), color);
  getWidthPermessi = (color: Color): number =>
    getRectWidthByColor(this.getPermessiPage(), color);

  getStartProcurementMateriali = (color: Color): number =>
    getRectStartXByColor(this.getProcurementMaterialiPage(), color);
  getWidthProcurementMateriali = (color: Color): number =>
    getRectWidthByColor(this.getProcurementMaterialiPage(), color);

  getStartProcurementLavori = (color: Color): number =>
    getRectStartXByColor(this.getProcurementLavoriPage(), color);
  getWidthProcurementLavori = (color: Color): number =>
    getRectWidthByColor(this.getProcurementLavoriPage(), color);

  getStartCostruzione = (color: Color): number =>
    getRectStartXByColor(this.getCostruzionePage(), color);
  getWidthCostruzione = (color: Color): number =>
    getRectWidthByColor(this.getCostruzionePage(), color);

  getStartRipristini = (color: Color): number =>
    getRectStartXByColor(this.getRispristiniPage(), color);
  getWidthRipristini = (color: Color): number =>
    getRectWidthByColor(this.getRispristiniPage(), color);

  private getDuration = (key: string): string =>
    getPaddedString(this.isActive(key) ? this.pageMap?.get(key)?.duration : 0);
  private getDelay = (key: string): string =>
    getPaddedString(this.isActive(key) ? this.pageMap?.get(key)?.delay : 0);

  getIngegneriaDuration = (): string => this.getDuration('ING');
  getPermessiDuration = (): string => this.getDuration('PS');
  getProcurementMaterialiDuration = (): string => this.getDuration('MAT');
  getProcurementLavoriDuration = (): string => this.getDuration('PL');
  getCostruzioneDuration = (): string => this.getDuration('COS');
  getRipristiniDuration = (): string => this.getDuration('RP');

  getIngegneriaDelay = (): string => this.getDelay('ING');
  getPermessiDelay = (): string => this.getDelay('PS');
  getProcurementMaterialiDelay = (): string => this.getDelay('MAT');
  getProcurementLavoriDelay = (): string => this.getDelay('PL');
  getCostruzioneDelay = (): string => this.getDelay('COS');
  getRipristiniDelay = (): string => this.getDelay('RP');

  hasMessaInEsercizioMap = (): boolean =>
    this.getMessaInEsercizioPage().map[0] >= 0;
  hasMessaInEsercizioPlanned = (): boolean =>
    this.getMessaInEsercizioPage().done[0] >= 0;

  hasToday = (): boolean => {
    const todayPage = this.pageMap.get('TODAY').map;
    return todayPage[0] !== 1 && todayPage[1] !== 1 && todayPage[0] !== 0;
  };

  getToday = (): string => {
    const xCoord = getRectStartX(this.pageMap.get('TODAY').map);
    return `m ${xCoord},48 C ${xCoord},168 ${xCoord},168 ${xCoord},168 v 0`;
  };

  getStartMessaInEsercizioMap = (): string => {
    const milestoneMap = [...this.pageMap?.get('EE').map];
    if (!!milestoneMap.length && milestoneMap[0] === 36) {
      milestoneMap[0] = 37;
    }
    const x = getMilestoneX(milestoneMap);
    return `m ${x},139 2.5,2.5 -2.5,2.5 -2.5,-2.5 z`;
  };

  getStartMessaInEsercizioPlanned = (): string =>
    `m ${getMilestoneX(
      this.pageMap?.get('EE').done
    )},147 2.5,2.5 -2.5,2.5 -2.5,-2.5 z`;

  getMessaInEsercizioStyle = (): string => {
    const item = this.pageMap?.get('EE');
    let color = item?.progress === 100 ? '#ffff00' : '#ff0000';
    color = item?.isActive ? color : '#cccccc90';
    return `fill:${color};fill-opacity:1;stroke:none;stroke-width:0.176389;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1`;
  };

  getSvgId = (): string => `export_gantt_${this.currentPage}`;

  getYear = (index: number): number =>
    this.startYear + 3 * (this.currentPage - 1) + index - 1;

  private isActive = (key: string) =>
    this.pageMap.has(key) ? !!this.pageMap.get(key).isActive : false;

  getIngegneriaColor = (color: string): string =>
    `fill:${this.isActive('ING') ? color : '#cccccc90'}`;
  getPermessiColor = (color: string): string =>
    `fill:${this.isActive('PS') ? color : '#cccccc90'}`;
  getProcurementMaterialiColor = (color: string): string =>
    `fill:${this.isActive('MAT') ? color : '#cccccc90'}`;
  getProcurementLavoriColor = (color: string): string =>
    `fill:${this.isActive('PL') ? color : '#cccccc90'}`;
  getCostruzioneColor = (color: string): string =>
    `fill:${this.isActive('COS') ? color : '#cccccc90'}`;
  getRipristiniColor = (color: string) =>
    `fill:${this.isActive('RP') ? color : '#cccccc90'}`;
  getMessaInEsercizioColor = (color: string) =>
    `fill:${this.isActive('EE') ? color : '#cccccc90'}`;
}
