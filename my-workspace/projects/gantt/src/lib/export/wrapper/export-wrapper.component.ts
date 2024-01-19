import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    ViewChild
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as Moment from 'moment';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import 'svg2pdf.js';
import { PDFDocument } from 'pdf-lib';
import * as moment from 'moment';
import { getRanges, splitActivity } from '../pagination.utils';

export interface DialogData {
    items: any;
    projectName: string;
    projectCode: string;
    maker: string;
    mapStartDate: moment.Moment;
    timePrecision: string;
    isAtemporal?: boolean;
}

@Component({
    selector: 'lib-export-gantt-wrapper',
    templateUrl: 'export-wrapper.component.html',
    styleUrls: ['export-wrapper.component.scss']
})
export class GanttExportWrapperComponent implements AfterViewInit {
    private currentDate: string;
    private project: any;
    private fullGantt: any;
    private phaseDurationMap: Map<string, any>;
    private startPadding: number;

    private ranges = [];
    private splittedPhaseMap = new Map();

    constructor(
        public dialogRef: MatDialogRef<GanttExportWrapperComponent>,
        @Inject(MAT_DIALOG_DATA) private data: DialogData
    ) {
        const projectStartDate = data.mapStartDate?.isValid()
            ? moment(data.mapStartDate)
            : moment();
        this.currentDate = Moment().format('DD/MM/YYYY');
        this.startPadding = data?.isAtemporal ? 0 : projectStartDate.month();
        if (data?.items) {
            this.project = [...data.items].find((item) => item.level === 0);
            this.phaseDurationMap = new Map(
                [...data.items].map((item) => [
                    item.externalCode,
                    {
                        startMonth: item.startMonth + this.startPadding,
                        duration: item.duration,
                        isActive: item.isActive,
                        isMilestone: item.isMilestone
                    }
                ])
            );
            // adjust project duration
            this.fullGantt = {
                startMonth: this.project?.startMonth,
                duration: [...this.phaseDurationMap.values()]
                    .map((item) => item.startMonth + item.duration)
                    .reduce((p, c) => (c > p ? c : p), 0)
            };
            this.ranges = getRanges(this.fullGantt, this.startPadding);
            [...this.phaseDurationMap.entries()].forEach((entry) => {
                this.splittedPhaseMap.set(
                    entry[0],
                    splitActivity(entry[1], this.ranges, true)
                );
            });
        }
    }

    get isAtemporal(): boolean {
        return !!this.data?.isAtemporal;
    }

    get pages(): number[] {
        return this.ranges.map((_, i) => i + 1);
    }

    get projectName(): string {
        return this.data?.projectName;
    }

    get projectCode(): string {
        return this.data?.projectCode;
    }

    get maker(): string {
        return this.data?.maker;
    }

    get timePrecision(): string {
        return this.data?.timePrecision;
    }

    get startYear(): number {
        return this.data?.mapStartDate?.isValid()
            ? this.data?.mapStartDate?.year()
            : moment().year();
    }

    get date(): string {
        return this.currentDate;
    }

    getPageMap = (page: number) =>
        this.splittedPhaseMap
            ? new Map(
                  [...this.splittedPhaseMap.entries()].map((entry) => [
                      entry[0],
                      entry[1][page - 1]
                  ])
              )
            : new Map();

    async mergePdfs(pdfs: ArrayBuffer[]): Promise<any> {
        const finalPdf = await PDFDocument.create();
        const actions = pdfs.map(async (pdfBuffer) => {
            const pdf = await PDFDocument.load(pdfBuffer);
            const pages = await finalPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach((page) => {
                finalPdf.addPage(page);
            });
        });
        await Promise.all(actions);
        const file = await finalPdf.save();
        saveAs(
            new File([file], `${this.projectCode}.pdf`, {
                type: 'application/pdf'
            })
        );
    }

    createPdfBuffer(): Promise<any> {
        return Promise.all(
            this.pages
                .map((page) => document.getElementById(`export_gantt_${page}`))
                .map(async (element) => {
                    const doc = new jsPDF('landscape');
                    doc.setFont('helvetica');
                    const svg = await doc.svg(element, {
                        x: 0,
                        y: 0,
                        width: 297,
                        height: 210
                    });
                    return Promise.resolve(svg.output('arraybuffer'));
                })
        );
    }

    ngAfterViewInit(): void {
        this.createPdfBuffer().then((buffer) => this.mergePdfs(buffer));
    }
}
