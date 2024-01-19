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
import {
  GanttItemMultiProject,
  GanttTaskBars
} from '../../@model/gantt-item-multiproject.model';
import * as gridFn from '../../@services/gantt-multiproject-grid.functions';
import { GanttMultiProjectService } from '../../@services/gantt-multiproject.service';
import { Header } from '../../@services/gantt-project.service';
import * as config from '../gantt.config';

@Component({
  selector: 'lib-multi-project-grid',
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
  items: GanttItemMultiProject[] = [];

  itemsSubscription: Subscription;
  headerSubscription: Subscription;

  constructor(
    private renderer: Renderer2,
    private ganttService: GanttMultiProjectService,
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
    const _rowSize = config.ROWSIZE;
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
      style.gridTemplateColumns = cols.map((_) => config.ONE_FR).join(' ');
      style.height = `${rows.reduce(
        (prev: number, curr: number) => prev + curr * rowSize,
        0
      )}px`;
      style.gridTemplateRows = rows.map((fr) => `${fr}fr`).join(' ');
    };

    const itemRows: number[] = this.items.map(
      (item: GanttItemMultiProject) => 1
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
        prev + ` ${_rowSize / config.ROWSPAN}px`.repeat(3),
      ''
    );

    /* Clean ganttGrid */
    (this.ganttGrid.nativeElement as HTMLElement).innerHTML = '';
  }

  updateGrid(items: GanttItemMultiProject[]): void {
    this.items = items;
    this.initHeader();
    this.initGrid();
    let rowIndex = 0;
    this.items.forEach((item: GanttItemMultiProject, index: number) => {
      if (index) {
        rowIndex += 2;
      }
      this.drawItem(item, rowIndex);
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
  }

  initHeader(): void {
    const styleDecl = (this.header.nativeElement as HTMLElement).style;
    styleDecl.gridTemplateColumns = Array(this.cols.length)
      .fill(1)
      .map((_) => config.ONE_FR)
      .join(' ');
    styleDecl.width = `${config.COLSIZE * this.cols.length}px`;
  }

  private drawItem(item: GanttItemMultiProject, row: number): void {
    const bars: GanttTaskBars = gridFn.calculateBars(
      item,
      this.startDate,
      config.MAP_COLOR,
      config.ACTUAL_COLOR,
      config.PROGRESS_COLOR,
      config.COMPLETED_COLOR,
      config.INACTIVE
    );
    this.drawBars(bars, row);
  }

  private drawBars(bars: GanttTaskBars, row: number): void {
    const _row = row + 1;

    const baseLineBarRow = _row;
    const forecastActualBarRow = _row + 1;

    if (bars.lastReauthBar) {
      this.drawBar(
        `${bars.id}_baseline`,
        baseLineBarRow,
        bars.lastReauthBar.start,
        bars.lastReauthBar.end,
        bars.lastReauthBar.color,
        true,
        true
      );
    }
    if (bars.forecastBar) {
      this.drawBar(
        `${bars.id}_actual`,
        forecastActualBarRow,
        bars.forecastBar.start,
        bars.forecastBar.end,
        bars.forecastBar.color,
        false
      );
    }

    if (bars.actualBar) {
      this.drawBar(
        `${bars.id}_progress`,
        forecastActualBarRow,
        bars.actualBar.start,
        bars.actualBar.end,
        bars.actualBar.color,
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
    isUpper = false,
    isStriped = false
  ): void {
    const divTask: HTMLElement = this.renderer.createElement('div');
    divTask.style.gridColumn = `${start}/${end}`;
    divTask.style.gridRow = `${row}`;
    if (isStriped) {
      divTask.style.background = gridFn.makeStripedBar(color);
      divTask.style.border = `${color} solid 0.3rem`;
    } else {
      divTask.style.backgroundColor = `${color}`;
    }
    divTask.style.boxSizing = 'border-box';
    divTask.style.marginTop = isUpper ? '5px' : '2px';

    divTask.style.height = `${config.BAR_HEIGHT}px`;
    divTask.style.borderRadius = '2px';
    this.renderer.setProperty(divTask, 'id', taskName);
    this.renderer.appendChild(this.ganttGrid.nativeElement, divTask);
  }
}
