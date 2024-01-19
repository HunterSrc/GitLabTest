import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    Input,
    OnDestroy,
    Renderer2,
    ViewChild
} from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import {
    GanttItemExecution,
    GanttTaskBars
} from '../../@model/gantt-item-execution.model';
import * as gridFn from '../../@services/gantt-execution-grid.functions';
import { isLowLevel } from '../../@services/gantt-execution-task.functions';
import {
    GanttExecutionService,
    Header
} from '../../@services/gantt-execution.service';
import * as config from '../gantt.config';

@Component({
    selector: 'lib-execution-grid',
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GridComponent implements OnDestroy, AfterViewInit {
    @ViewChild('backgroundGrid') backgroundGrid: ElementRef;
    @ViewChild('ganttGrid') ganttGrid: ElementRef;
    @ViewChild('header') header: ElementRef;
    cols: string[] = [];
    startDate: moment.Moment;
    endDate: moment.Moment;
    items: GanttItemExecution[] = [];

    private _showProjectBar = false;

    get showProjectBar(): boolean {
        return this._showProjectBar;
    }
    @Input() set showProjectBar(mode: boolean) {
        this._showProjectBar = mode;
        if (this.items?.length) {
            this.updateGrid(this.items);
        }
    }

    private _showZeroWeightRows = true;
    get showZeroWeightRows(): boolean {
        return this._showZeroWeightRows;
    }
    @Input() set showZeroWeightRows(mode: boolean) {
        this._showZeroWeightRows = mode;
        if (this.items?.length) {
            this.updateGrid(this.items);
        }
    }

    private _isNominativa = !!true;

    @Input() set isNominativa(value: boolean) {
        this._isNominativa = value;
        if (this.items?.length) {
            this.updateGrid(this.items);
        }
    }

    get isNominativa(): boolean {
        return this._isNominativa;
    }

    constructor(
        private renderer: Renderer2,
        private ganttService: GanttExecutionService,
        private ref: ChangeDetectorRef
    ) {}

    headerSubscription: Subscription;
    itemsSubscription: Subscription;

    ngAfterViewInit(): void {
        this.headerSubscription = this.ganttService
            .getHeader()
            .subscribe((header) => (this.gridHeader = header));
        this.itemsSubscription = this.ganttService
            .getItems()
            .subscribe((items) => this.updateGrid(items));
    }

    ngOnDestroy(): void {
        this.headerSubscription?.unsubscribe();
        this.itemsSubscription?.unsubscribe();
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
        const _rowSize = this.isNominativa
            ? config.ROWSIZE
            : config.ROWSIZE_SMALL;
        const getArr = (n) => Array(n).fill(1);
        const applyCss = (
            // tslint:disable-next-line
            style: CSSStyleDeclaration,
            rows: number[],
            // tslint:disable-next-line
            cols: number[],
            rowSize: number,
            colSize: number
        ) => {
            style.width = `${cols.length * colSize}px`;
            style.gridTemplateColumns = cols
                .map((_) => config.ONE_FR)
                .join(' ');
            style.height = `${rows.reduce(
                (prev: number, curr: number) => prev + curr * rowSize,
                0
            )}px`;
            style.gridTemplateRows = rows.map((fr) => `${fr}fr`).join(' ');
        };

        const itemRows: number[] = this.items
            .filter((_, index: number) => this.showRow(index))
            .map((item: GanttItemExecution) =>
                isLowLevel(item) ? config.HEIGHT_MULTIPLIER : 1
            );

        /* backgroundGrid */
        applyCss(
            (this.backgroundGrid.nativeElement as HTMLElement).style,
            itemRows,
            getArr(this.cols.length),
            _rowSize,
            config.COLSIZE
        );

        /* ganttGrid */
        const style = (this.ganttGrid.nativeElement as HTMLElement).style;
        const cols = getArr(this.cols.length * config.COLSPAN);

        style.width = `${(cols.length * config.COLSIZE) / config.COLSPAN}px`;
        style.gridTemplateColumns = cols.map((_) => config.ONE_FR).join(' ');

        style.height = `${itemRows
            .map((n) => n * config.ROWSPAN)
            .reduce(
                (prev: number, curr: number) =>
                    prev + (curr * _rowSize) / config.ROWSPAN,
                0
            )}px`;
        style.gridTemplateRows = itemRows.reduce(
            (prev: string, curr: number) =>
                prev +
                (curr === 1
                    ? ` ${_rowSize / (config.ROWSPAN - 1)}px`.repeat(3)
                    : ` ${(_rowSize * config.HEIGHT_MULTIPLIER) / config.ROWSPAN}px`.repeat(
                          config.ROWSPAN
                      )),
            ''
        );

        /* Clean ganttGrid */
        (this.ganttGrid.nativeElement as HTMLElement).innerHTML = '';
    }

    updateGrid(items: GanttItemExecution[]): void {
        this.items = items;
        this.initHeader();
        this.initGrid();
        let rowIndex = 0;
        this.items
            .filter((_, index: number) => this.showRow(index))
            .forEach((item: GanttItemExecution, index: number) => {
                if (index) {
                    rowIndex += isLowLevel(item) ? 4 : 3;
                }
                if (this.isNominativa && !!item.isActive) {
                    this.drawItem(item, rowIndex);
                } else if (item.level <= 2 && !!item.isActive) {
                    this.drawItem(item, rowIndex);
                }
            });
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
        if (items?.length) {
            this.showHeader();
        }
    }

    initHeader(): void {
        const styleDecl = (this.header.nativeElement as HTMLElement).style;
        styleDecl.gridTemplateColumns = Array(this.cols.length)
            .fill(1)
            .map((_) => config.ONE_FR)
            .join(' ');
        styleDecl.height = 'auto';
        styleDecl.width = `${config.COLSIZE * this.cols.length}px`;
    }

    showHeader(): void {
        if (this.header?.nativeElement) {
            (this.header.nativeElement as HTMLElement).style.visibility =
                'visible';
        }
    }

    private drawItem(item: GanttItemExecution, row: number): void {
        const bars: GanttTaskBars = gridFn.calculateBars(
            item,
            this.startDate,
            config.BASELINE_COLOR,
            config.ACTUAL_COLOR,
            config.PROGRESS_COLOR,
            config.COMPLETED_COLOR,
            config.MAP_COLOR,
            config.LAST_REAUTH_COLOR,
            config.INACTIVE
        );
        this.drawBars(bars, row, !isLowLevel(item));
    }

    private drawBars(bars: GanttTaskBars, row: number, isSmall: boolean): void {
        const _row = row + 1;

        let mapBarRow;
        let lastReauthBarRow;
        let baseLineBarRow;
        let forecastActualBarRow;
        // TODO rendere il metodo context free
        if (this.isNominativa) {
            mapBarRow = _row;
            lastReauthBarRow = _row + 1;
            baseLineBarRow = _row + (isSmall ? 0 : 2);
            forecastActualBarRow =
                _row + (isSmall ? 1 : this.showProjectBar ? 3 : 2);
        } else {
            baseLineBarRow = _row + 1;
            forecastActualBarRow = _row + 2;
        }

        if (!isSmall) {
            if (bars.mapBar && this.isNominativa) {
                this.drawBar(
                    `${bars.id}_map`,
                    mapBarRow,
                    bars.mapBar.start,
                    bars.mapBar.end,
                    bars.mapBar.color
                );
            }

            if (bars.lastReauthBar && this.isNominativa) {
                this.drawBar(
                    `${bars.id}_lastReauth`,
                    lastReauthBarRow,
                    bars.lastReauthBar.start,
                    bars.lastReauthBar.end,
                    bars.lastReauthBar.color,
                    true
                );
            }
        }

        if (bars.baselineBar && this.showProjectBar) {
            this.drawBar(
                `${bars.id}_baseline`,
                baseLineBarRow,
                bars.baselineBar.start,
                bars.baselineBar.end,
                bars.baselineBar.color,
                false,
                true
            );
        }
        if (bars.forecastBar) {
            this.drawBar(
                `${bars.id}_forecast`,
                forecastActualBarRow,
                bars.forecastBar.start,
                bars.forecastBar.end,
                bars.forecastBar.color,
                false,
                false
            );
        }
        if (bars.actualBar) {
            this.drawBar(
                `${bars.id}_actual`,
                forecastActualBarRow,
                bars.actualBar.start,
                bars.actualBar.end,
                bars.actualBar.color,
                false,
                false
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
        color: string = config.BASELINE_COLOR,
        striped = false,
        isUpper = true
    ): void {
        const divTask: HTMLElement = this.renderer.createElement('div');
        divTask.style.gridColumn = `${start}/${end}`;
        divTask.style.gridRow = `${row}`;
        if (striped) {
            divTask.style.background = gridFn.makeStripedBar(color);
            divTask.style.border = `${color} solid 0.3rem`;
        } else {
            divTask.style.backgroundColor = `${color}`;
        }
        divTask.style.boxSizing = 'border-box';
        if (this.isNominativa) {
            divTask.style.marginTop = this.showProjectBar ? '1.5px' : '10px';
        } else {
            divTask.style.marginTop = isUpper
                ? '0px'
                : this.showProjectBar
                  ? '5px'
                  : '-6px';
        }

        divTask.style.height = `${config.BAR_HEIGHT}px`;
        divTask.style.borderRadius = '2px';
        this.renderer.setProperty(divTask, 'id', taskName);
        this.renderer.appendChild(this.ganttGrid.nativeElement, divTask);
    }

    showRow(index: number) {
        return !this.showZeroWeightRows || this.items[index].weight > 0;
    }
}
