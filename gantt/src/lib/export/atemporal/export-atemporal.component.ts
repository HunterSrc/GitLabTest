import { AfterViewInit, Component, Input } from '@angular/core';
import { GANTT_PAGE_WIDTH } from '../pagination.utils';

const MONTH_WIDTH = 7;
const GANTT_START_X = 42;
const MILESTONE_START_X = 49;

const getRectStartX = (phasePage: number[]): number => phasePage?.length > 0 ? GANTT_START_X + (MONTH_WIDTH * (phasePage[0] - 1)) : 0;
const getMilestoneX = (phasePage: number[]): number => phasePage?.length > 0 ?
    MILESTONE_START_X + (MONTH_WIDTH * ((phasePage[0] === 0 ? GANTT_PAGE_WIDTH : phasePage[0]) - 1)) : -1;
const getRectWidth = (phasePage: number[]): number => MONTH_WIDTH * calculateDuration(phasePage);
const calculateDuration = (phase: number[]): number =>
    phase?.length > 1 && !!phase[1] && !!phase[0] && phase[1] > phase[0] ? phase[1] - phase[0] : 0;

const getPaddedString = (duration: number): string => +duration < 9 ? ` ${duration}` : `${duration}`;

@Component({
    selector: 'lib-export-atemporal',
    templateUrl: 'export-atemporal.component.html'
})
export class GanttAtemporalExportComponent implements AfterViewInit {

    @Input() private date;
    @Input() private currentPage;
    @Input() private project: any;
    @Input() private durationMap: Map<string, any>;
    @Input() private pageMap: Map<string, any>;
    @Input() private projectName: string;
    @Input() private projectCode: string;
    @Input() private maker: string;
    @Input() private timePrecision: string;

    constructor() {}

    ngAfterViewInit(): void {}

    private getPageValues = (key: string) => this.pageMap?.has(key) ? this.pageMap?.get(key) : [];

    private isActive = (key: string) =>  this.pageMap.has(key) ? !!this.pageMap.get(key)[2] : false;

    getProjectName = (): string => this.projectName?.length < 100 ? this.projectName : `${this.projectName?.substring(0, 97)}...`;
    getProjectNumber = (): string => this.projectCode;

    getMaker = (): string => this.maker;
    getDate = (): string => this.date;
    getTimePrecision = (): string => this.timePrecision;

    getProjectDuration = (): number => this.project?.duration || 0;

    getProjectPage = (): number[] => this.getPageValues(this.projectCode);
    getIngegneriaPage = (): number[] => this.getPageValues('ING');
    getPermessiPage = (): number[] => this.getPageValues('PS');
    getProcurementMaterialiPage = (): number[] => this.getPageValues('MAT');
    getProcurementLavoriPage = (): number[] => this.getPageValues('PL');
    getCostruzionePage = (): number[] => this.getPageValues('COS');
    getRispristiniPage = (): number[] => this.getPageValues('RP');
    getComunicazioneElencoPermessiPage = (): number[] => this.getPageValues('CEP');
    getMessaInEsercizioPage = (): number[] => this.getPageValues('EE');

    getStartTargetDaMap = (): number => getRectStartX(this.getProjectPage());
    getWidthTargetDaMap = (): number => getRectWidth(this.getProjectPage());

    getStartIngegneria = (): number => getRectStartX(this.getIngegneriaPage());
    getWidthIngegneria = (): number => getRectWidth(this.getIngegneriaPage());

    getStartPermessi = (): number => getRectStartX(this.getPermessiPage());
    getWidthPermessi = (): number => getRectWidth(this.getPermessiPage());

    getStartProcurementMateriali = (): number => getRectStartX(this.getProcurementMaterialiPage());
    getWidthProcurementMateriali = (): number => getRectWidth(this.getProcurementMaterialiPage());

    getStartProcurementLavori = (): number => getRectStartX(this.getProcurementLavoriPage());
    getWidthProcurementLavori = (): number => getRectWidth(this.getProcurementLavoriPage());

    getStartCostruzione = (): number => getRectStartX(this.getCostruzionePage());
    getWidthCostruzione = (): number => getRectWidth(this.getCostruzionePage());

    getStartRipristini = (): number => getRectStartX(this.getRispristiniPage());
    getWidthRipristini = (): number => getRectWidth(this.getRispristiniPage());

    getIngegneriaDuration = (): string => getPaddedString(this.isActive('ING') ? this.durationMap?.get('ING')?.duration : 0);
    getPermessiDuration = (): string => getPaddedString(this.isActive('PS') ? this.durationMap?.get('PS')?.duration : 0);
    getProcurementMaterialiDuration = (): string => getPaddedString(this.isActive('MAT') ? this.durationMap?.get('MAT')?.duration : 0);
    getProcurementLavoriDuration = (): string => getPaddedString(this.isActive('PL') ? this.durationMap?.get('PL')?.duration : 0);
    getCostruzioneDuration = (): string => getPaddedString(this.isActive('COS') ? this.durationMap?.get('COS')?.duration : 0);
    getRipristiniDuration = (): string => getPaddedString(this.isActive('RP') ? this.durationMap?.get('RP')?.duration : 0);

    getStyleIngegneria = (): string =>
        `fill:${ this.isActive('ING') ? '#9acd00ff' : '#cccccc90'};fill-opacity:1;stroke:none;stroke-width:0.176389;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1`
    getStylePermessi = (): string =>
        `fill:${ this.isActive('PS') ? '#9acd00ff' : '#cccccc90'};fill-opacity:1;stroke:none;stroke-width:0.176389;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1`
    getStyleProcurementMateriali = (): string =>
        `fill:${ this.isActive('MAT') ? '#9acd00ff' : '#cccccc90'};fill-opacity:1;stroke:none;stroke-width:0.176389;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1`
    getStyleProcurementLavori = (): string =>
        `fill:${ this.isActive('PL') ? '#9acd00ff' : '#cccccc90'};fill-opacity:1;stroke:none;stroke-width:0.176389;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1`
    getStyleCostruzione = (): string =>
        `fill:${ this.isActive('COS') ? '#9acd00ff' : '#cccccc90'};fill-opacity:1;stroke:none;stroke-width:0.176389;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1`
    getStyleRipristini = (): string =>
        `fill:${ this.isActive('RP') ? '#9acd00ff' : '#cccccc90'};fill-opacity:1;stroke:none;stroke-width:0.176389;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1`

    getStyleComunicazioneElencoPermessi = (): string =>
        `fill:${ this.isActive('CEP') ? '#9acd00ff' : '#cccccc90'};fill-opacity:1;stroke:none;stroke-width:0.176389;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1`
    getStyleMessaInEsercizio = (): string =>
        `fill:${ this.isActive('EE') ? '#9acd00ff' : '#cccccc90'};fill-opacity:1;stroke:none;stroke-width:0.176389;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1`


    hasComunicazioneElencoPermessi = (): boolean => this.getComunicazioneElencoPermessiPage()[0] >= 0;
    hasMessaInEsercizio = (): boolean => this.getMessaInEsercizioPage()[0] >= 0;

    // d="m 49,158 2.5,2.5 -2.5,2.5 -2.5,-2.5 z"
    // TODO Parametrizzare ordinate
    getStartComunicazioneElencoPermessi = (): string => `m ${getMilestoneX(this.getComunicazioneElencoPermessiPage())},83 2.5,2.5 -2.5,2.5 -2.5,-2.5 z`;
    getStartMessaInEsercizio = (): string => `m ${getMilestoneX(this.getMessaInEsercizioPage())},158 2.5,2.5 -2.5,2.5 -2.5,-2.5 z`;

    getMonthLabel = (index: number): string => (((+this.currentPage - 1) * 36) + index) + '';

    getSvgId = (): string => `export_gantt_${this.currentPage}`;

}
