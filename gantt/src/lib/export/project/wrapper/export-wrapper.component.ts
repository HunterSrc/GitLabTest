import { AfterViewInit, Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GanttItem } from '../../../@model/gantt-item-project.model';
import { DialogData } from '../../wrapper/export-wrapper.component';
import { Activity, getRanges, splitActivity } from '../../pagination.utils';
import {
    GanttRow,
    getDoneActivity,
    getGanttRowLimit,
    getIntervals,
    getMapActivity,
    getTodayIntervals,
    getTodoActivity,
    shiftIntervals } from '../export-project.utils';
import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import * as Moment from 'moment';


@Component({
    selector: 'lib-export-project-wrapper',
    templateUrl: './export-wrapper.component.html',
    styleUrls: ['./export-wrapper.component.scss']
})
export class GanttProjectExportWrapperComponent implements AfterViewInit {

    private projectItemsMap: Map<string, GanttRow>;
    private projectMapsMap: Map<string, any> = new Map();
    private projectTodosMap: Map<string, any> = new Map();
    private projectDoneMap: Map<string, any> = new Map();
    private projectDuration: number;
    private currentDate: string;
    private ranges;

    get projectCode(): string {
        return this.data?.projectCode;
    }

    get projectName(): string {
        return this.data?.projectName;
    }

    get pages(): number[] {
        return this.ranges.map((_, i) => i + 1);
    }

    get startYear(): number {
        return this.data?.mapStartDate?.year();
    }

    get maker(): string {
        return this.data?.maker;
    }

    get date(): string {
        return this.currentDate;
    }

    get timePrecision(): string {
        return this.data?.timePrecision;
    }

    constructor(public dialogRef: MatDialogRef<GanttProjectExportWrapperComponent>, @Inject(MAT_DIALOG_DATA) private data: DialogData) {
        this.currentDate = Moment().format('DD/MM/YYYY');
        const items = data.items as GanttItem[];
        const gridStart = data.mapStartDate;
        const intervals = [
            ...items.map(item => ({
                ...getIntervals(item, gridStart),
                externalCode: item.externalCode,
                isMilestone: item.isMilestone,
                isActive: item.isActive,
                progress: item.progress,
                hasActualStartDate: item.hasActualStartDate,
                delay: item.delay } as GanttRow)),
                {
                ...getTodayIntervals(gridStart),
                externalCode: 'TODAY',
                isMilestone: false,
                isActive: true,
                progress: 0,
                delay: 0,
                duration: 1,
                hasActualStartDate: false,
                }
            ].map(item => shiftIntervals(item, gridStart.month() + 1));
        this.projectItemsMap = new Map(intervals.map(item => [item.externalCode, item]));
        this.projectDuration = Math.max(...intervals.map(getGanttRowLimit));
        this.ranges = getRanges({ startMonth: 0, duration: this.projectDuration });
        this.initMaps();
    }

    private initMaps(): void {
        this.initProjectMapsMap();
        this.initProjectTodosMap();
        this.initProjectDoneMap();
    }

    private initProjectMapsMap =  (): void => {
        [...this.projectItemsMap.entries()].forEach(entry => {
            this.projectMapsMap.set(entry[0], getMapActivity(entry[1]));
        });
        this.updateMap(this.projectMapsMap);
    }

    private initProjectTodosMap =  (): void => {
        [...this.projectItemsMap.entries()].forEach(entry => {
            this.projectTodosMap.set(entry[0], getTodoActivity(entry[1]));
        });
        this.updateMap(this.projectTodosMap);
    }

    private initProjectDoneMap =  (): void => {
        [...this.projectItemsMap.entries()].forEach(entry => {
            this.projectDoneMap.set(entry[0], getDoneActivity(entry[1]));
        });
        this.updateMap(this.projectDoneMap);
    }

    private updateMap = (map: Map<string, any>) => {
        [...map.keys()].forEach(key => this.splitActivityMapItem(map, key));
    }

    private splitActivityMapItem = (map: Map<string, any>, key: string) => {
        const activity: Activity = { ...map.get(key) } as Activity;
        map.set(key, splitActivity(activity, this.ranges));
    }

    private getPageMap = (map: Map<string, number[][]>, page: number): Map<string, number[]> =>
    !!map ?
        new Map([...map.entries()].map(entry => [entry[0], entry[1][page - 1]])) :
        new Map()

    private getMapsPageMap = (page: number): Map<string, number[]> => this.getPageMap(this.projectMapsMap, page);

    private getTodosPageMap = (page: number): Map<string, number[]> => this.getPageMap(this.projectTodosMap, page);

    private getDonePageMap = (page: number): Map<string, number[]> => this.getPageMap(this.projectDoneMap, page);

    getGanttRowsMap = (page: number): Map<string, GanttRow> => {
        const mapsPageMap = this.getMapsPageMap(page);
        const todosPageMap = this.getTodosPageMap(page);
        const donePageMap = this.getDonePageMap(page);
        const calculateDelay = (key: string): number => {
            const todo = this.projectItemsMap.get(key)?.todo;
            const done = this.projectItemsMap.get(key)?.done;
            return todo[1] + done[1];
        };
        const result: Map<string, GanttRow> = new Map();
        [...this.projectItemsMap.entries()].forEach(entry => {
            const row: GanttRow = {
                isActive: entry[1].isActive,
                isMilestone: entry[1].isMilestone,
                externalCode: entry[1].externalCode,
                delay: calculateDelay(entry[0]),
                duration: entry[1].map[1],
                progress: entry[1].progress,
                map: mapsPageMap.get(entry[0]),
                todo: todosPageMap.get(entry[0]),
                done: donePageMap.get(entry[0]),
                hasActualStartDate: !!entry[1].hasActualStartDate,
            };
            result.set(entry[0], row);
        });
        return result;
    }

    async mergePdfs(pdfs: ArrayBuffer[]): Promise<any> {
        const finalPdf = await PDFDocument.create();
        const actions = pdfs.map(
            async pdfBuffer => {
                const pdf = await PDFDocument.load(pdfBuffer);
                const pages = await finalPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => { finalPdf.addPage(page); });
        });
        await Promise.all(actions);
        const file = await finalPdf.save();
        saveAs(new File([file], `${this.projectCode}.pdf`, { type: 'application/pdf' }));
    }

    createPdfBuffer(): Promise<any> {
        return Promise.all(
            this.pages
            .map(page => document.getElementById(`export_gantt_${page}`))
            .map(async element => {
                const doc = new jsPDF('landscape');
                const svg = await doc.svg(element, { x: 0, y: 0, width: 297, height: 210 });
                return Promise.resolve(svg.output('arraybuffer'));
            })
        );
    }

    ngAfterViewInit(): void {
        this.createPdfBuffer().then(buffer => this.mergePdfs(buffer));
    }
}
