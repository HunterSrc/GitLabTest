import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    Renderer2,
    ViewChild
} from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { GanttBar } from '../../@model/gantt-item-execution.model';
import { GanttItemTemporal } from '../../@model/gantt-item-temporal.model';
import { Header } from '../../@services/gantt-atemporal.service';
import { calculateBar } from '../../@services/gantt-execution-grid.functions';
import {
    isCommission,
    isProject
} from '../../@services/gantt-execution-task.functions';
import { GanttTemporalService } from '../../@services/gantt-temporal.service';
import { COMMISSION_COLOR, INACTIVE } from '../../atemporal/gantt.config';
import { BASELINE_COLOR, PROGRESS_COLOR } from '../../execution/gantt.config';
import * as config from '../gantt.config';

@Component({
    selector: 'lib-temporal-grid',
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GridComponent implements AfterViewInit, OnDestroy {
    @ViewChild('backgroundGrid') backgroundGrid: ElementRef;
    @ViewChild('ganttGrid') ganttGrid: ElementRef;
    @ViewChild('header') header: ElementRef;
    cols: string[] = [];
    startDate: moment.Moment;
    items: GanttItemTemporal[] = [];

    headerSubscription: Subscription;
    itemsSubscription: Subscription;

    constructor(
        private renderer: Renderer2,
        private ganttService: GanttTemporalService,
        private ref: ChangeDetectorRef
    ) {}

    ngAfterViewInit(): void {
        this.headerSubscription = this.ganttService
            .getHeader()
            .subscribe((header) => (this.gridHeader = header));
        this.itemsSubscription = this.ganttService
            .getItems()
            .subscribe((items) => this.updateGrid(items));
    }

    ngOnDestroy(): void {
        this.itemsSubscription?.unsubscribe();
        this.headerSubscription?.unsubscribe();
    }

    set gridHeader(value: Header) {
        this.cols = value.columns;
        this.startDate = value.gridStartDate;
    }

    get gridHeader(): Header {
        return {
            columns: this.cols,
            gridStartDate: this.startDate
        };
    }

    get rows(): number[] {
        return new Array(this.items.length).fill(1);
    }

    initGrid(): void {
        const getArr = (n) => Array(n).fill(1);
        const applyCss = (
            style: CSSStyleDeclaration,
            rows: number[],
            cols: number[],
            rowSize: number,
            colSize: number
        ) => {
            style.gridTemplateColumns = cols
                .map((_) => config.ONE_FR)
                .join(' ');
            style.gridTemplateRows = rows.map((_) => config.ONE_FR).join(' ');
            // style.width = `${cols.length * colSize}px`;
            // style.width = config.FULL_WIDTH;
            style.width =
                this.cols.length <= 24
                    ? config.FULL_WIDTH
                    : `${config.COLSIZE * this.cols.length}px`;
            style.height = `${rows.length * rowSize}px`;
        };
        applyCss(
            (this.backgroundGrid.nativeElement as HTMLElement).style,
            getArr(this.items.length),
            getArr(this.cols.length),
            config.ROWSIZE,
            config.COLSIZE
        );
        applyCss(
            (this.ganttGrid.nativeElement as HTMLElement).style,
            getArr(this.items.length),
            getArr(this.cols.length * config.COLSPAN),
            config.ROWSIZE,
            config.COLSIZE / config.COLSPAN
        );
        (this.ganttGrid.nativeElement as HTMLElement).innerHTML = '';
    }

    updateGrid(items: GanttItemTemporal[]): void {
        this.items = items;
        this.initHeader();
        this.initGrid();
        this.items.forEach((item, row) => this.drawItem(item, row + 1));
        this.ref.detectChanges();
    }

    initHeader(): void {
        const styleDecl = (this.header.nativeElement as HTMLElement).style;
        styleDecl.gridTemplateColumns = Array(this.cols.length)
            .fill(1)
            .map((_) => config.ONE_FR)
            .join(' ');
        // styleDecl.width = `${config.COLSIZE * this.cols.length}px`;
        // styleDecl.width = config.FULL_WIDTH;
        styleDecl.width =
            this.cols.length <= 24
                ? config.FULL_WIDTH
                : `${config.COLSIZE * this.cols.length}px`;
    }

    private drawItem(item: GanttItemTemporal, row: number): void {
        if (
            (item.baselineStartDate as moment.Moment)?.isValid() &&
            (item.baselineEndDate as moment.Moment)?.isValid()
        ) {
            let color = BASELINE_COLOR;
            if (isCommission(item)) {
                color = COMMISSION_COLOR;
            }
            if (isProject(item)) {
                color = PROGRESS_COLOR;
            }
            if (!item.isActive) {
                color = INACTIVE;
            }
            const bar: GanttBar = calculateBar(
                item.baselineStartDate as moment.Moment,
                item.baselineEndDate as moment.Moment,
                this.startDate,
                color
            );
            this.drawBar(
                `${item.id}_baseline`,
                row,
                bar.start,
                bar.end,
                bar.color
            );
        }
    }

    private drawBar(
        taskName: string,
        row: number,
        start: number,
        end: number,
        color: string
    ): void {
        const divTask: HTMLElement = this.renderer.createElement('div');
        divTask.style.gridColumn = `${start}/${end}`;
        divTask.style.gridRow = `${row}`;
        divTask.style.backgroundColor = `${color}`;
        divTask.style.boxSizing = 'border-box';
        divTask.style.marginTop = `${config.BAR_MARGIN}px`;
        divTask.style.marginBottom = `${config.BAR_MARGIN}px`;
        divTask.style.height = `${config.BAR_HEIGHT}px`;
        divTask.style.borderRadius = '2px';
        this.renderer.setProperty(divTask, 'id', taskName);
        this.renderer.appendChild(this.ganttGrid.nativeElement, divTask);
    }
}
