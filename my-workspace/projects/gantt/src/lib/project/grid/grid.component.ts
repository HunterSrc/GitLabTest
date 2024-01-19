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
import { Subscription } from 'rxjs';
import * as moment from 'moment';
import { GanttItem } from '../../@model/gantt-item-project.model';
import * as gridFn from '../../@services/gantt-project-grid.function';
import {
    GanttProjectService,
    Header
} from '../../@services/gantt-project.service';
import * as config from '../gantt.config';

@Component({
    selector: 'lib-project-grid',
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
    endDate: moment.Moment;
    items: GanttItem[] = [];

    itemsSubscription: Subscription;
    headerSubscription: Subscription;

    constructor(
        private renderer: Renderer2,
        private ganttService: GanttProjectService,
        private ref: ChangeDetectorRef
    ) {}

    ngAfterViewInit(): void {
        this.itemsSubscription = this.ganttService
            .getHeader()
            .subscribe((header) => (this.gridHeader = header));
        this.headerSubscription = this.ganttService
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
        this.endDate = value.gridEndDate;
    }

    get gridHeader(): Header {
        return {
            columns: this.cols,
            gridStartDate: this.startDate,
            gridEndDate: this.endDate
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
            style.width = `${cols.length * colSize}px`;
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
            getArr(this.items.length * config.ROWSPAN),
            getArr(this.cols.length * config.COLSPAN),
            config.ROWSIZE / config.ROWSPAN,
            config.COLSIZE / config.COLSPAN
        );
        (this.ganttGrid.nativeElement as HTMLElement).innerHTML = '';
    }

    updateGrid(items: GanttItem[]): void {
        this.items = [...items];
        this.initHeader();
        this.initGrid();
        this.items.forEach((item, row) => this.drawItem(item, row));
        const currentDate = moment().startOf('day');
        if (
            !(
                currentDate.isBefore(this.startDate) ||
                currentDate.isAfter(this.endDate)
            )
        ) {
            const todayIndex = gridFn.calculateTodayCol(this.startDate);
            if (todayIndex < this.cols.length * config.COLSPAN) {
                this.drawColumn(todayIndex);
            }
        }
        this.ref.detectChanges();
    }

    initHeader(): void {
        const styleDecl = (this.header.nativeElement as HTMLElement).style;
        styleDecl.gridTemplateColumns = Array(this.cols.length)
            .fill(1)
            .map((_) => config.ONE_FR)
            .join(' ');
        styleDecl.width = `${config.COLSIZE * this.cols.length}px`;
    }

    private drawItem(item: GanttItem, row: number): void {
        const bars: gridFn.GanttTaskBars = gridFn.calculateBars(
            item,
            this.startDate,
            config.BASELINE_COLOR,
            config.ACTUAL_COLOR,
            config.PROGRESS_COLOR,
            config.COMPLETED_COLOR,
            config.INACTIVE
        );
        this.drawBars(bars, row);
    }

    private drawBars(bars: gridFn.GanttTaskBars, row: number): void {
        const _row = row * config.ROWSPAN + 1;
        if (bars.mapBar) {
            this.drawBar(
                `${bars.id}_map`,
                _row,
                bars.mapBar.start,
                bars.mapBar.end,
                true,
                bars.mapBar.color
            );
        }
        if (bars.plannedBar) {
            this.drawBar(
                `${bars.id}_actual`,
                _row + 1,
                bars.plannedBar.start,
                bars.plannedBar.end,
                false,
                bars.plannedBar.color
            );
        }
        if (bars.effectiveBar) {
            this.drawBar(
                `${bars.id}_progress`,
                _row + 1,
                bars.effectiveBar.start,
                bars.effectiveBar.end,
                false,
                bars.effectiveBar.color
            );
        }
    }

    private drawColumn(column: number): void {
        const divColumn: HTMLElement = this.renderer.createElement('div');
        divColumn.style.gridColumn = `${column}`;
        divColumn.style.gridRow = `1/${(this.items.length + 1) * config.ROWSPAN}`;
        divColumn.style.borderLeft = `2px solid red`;
        this.renderer.appendChild(this.ganttGrid.nativeElement, divColumn);
    }

    private drawBar(
        taskName: string,
        row: number,
        start: number,
        end: number,
        isUpper: boolean,
        color: string = config.BASELINE_COLOR
    ): void {
        const divTask: HTMLElement = this.renderer.createElement('div');
        divTask.style.gridColumn = `${start}/${end}`;
        divTask.style.gridRow = `${row}`;
        divTask.style.backgroundColor = `${color}`;
        divTask.style.boxSizing = 'border-box';
        divTask.style.marginTop = `${isUpper ? config.MARGIN_LG : config.MARGIN_SM}px`;
        divTask.style.marginBottom = `${isUpper ? config.MARGIN_SM : config.MARGIN_LG}px`;
        divTask.style.height = `${config.BAR_HEIGHT}px`;
        divTask.style.borderRadius = '2px';
        this.renderer.setProperty(divTask, 'id', taskName);
        this.renderer.appendChild(this.ganttGrid.nativeElement, divTask);
    }

    getRectDimensions = (): { width: number; height: number } => ({
        width: this.cols?.length * config.COLSIZE,
        height: this.rows?.length * config.ROWSIZE
    });
}
