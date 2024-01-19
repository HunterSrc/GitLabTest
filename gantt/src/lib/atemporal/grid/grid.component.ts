import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { GanttItemAtemporal } from '../../@model/gantt-item-atemporal.model';
import { isProject } from '../../@services/gantt-atemporal-task.functions';
import { GanttAtemporalService } from '../../@services/gantt-atemporal.service';
import * as config from '../gantt.config';

@Component({
  selector: 'lib-atemporal-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GridComponent implements AfterViewInit, OnDestroy{


  @ViewChild('backgroundGrid') backgroundGrid: ElementRef;
  @ViewChild('ganttGrid') ganttGrid: ElementRef;
  @ViewChild('header') header: ElementRef;
  cols: string[] = Array(config.MIN_COLS).fill(1).map((v, i) => v + i);
  startDate: moment.Moment;
  items: GanttItemAtemporal[] = [];

  showHeader: boolean;

  itemsSubscription: Subscription;

  constructor(private renderer: Renderer2,
              private ganttService: GanttAtemporalService,
              private ref: ChangeDetectorRef) { }


  ngAfterViewInit(): void {
    this.itemsSubscription = this.ganttService.getItems().subscribe(items => this.updateGrid(items));
  }

  ngOnDestroy(): void {
    this.itemsSubscription?.unsubscribe();
  }

  get rows(): number[] {
    return new Array(this.items.length).fill(1);
  }

  initGrid(): void {
    const getArr = n => Array(n).fill(1);
    const applyCss = (style: CSSStyleDeclaration, rows: number[], cols: number[], rowSize: number, colSize: number) => {
      style.gridTemplateColumns = cols.map(_ => config.ONE_FR).join(' ');
      style.gridTemplateRows = rows.map(_ => config.ONE_FR).join(' ');
      style.width =  cols.length <= 24 ? config.FULL_WIDTH : `${cols.length * colSize}px`;
      style.height = `${rows.length * rowSize}px`;
    };
    applyCss((this.backgroundGrid.nativeElement as HTMLElement).style,
              getArr(this.items.length),
              getArr(this.cols.length),
              config.ROWSIZE,
              config.COLSIZE);
    applyCss((this.ganttGrid.nativeElement as HTMLElement).style,
              getArr(this.items.length),
              getArr(this.cols.length),
              config.ROWSIZE,
              config.COLSIZE);
    (this.ganttGrid.nativeElement as HTMLElement).innerHTML = '';
  }

  updateGrid(items: GanttItemAtemporal[]): void {
    this.showHeader = !!items?.length;
    this.items = items;
    this.initHeader();
    this.initGrid();
    this.items.forEach(
      (item, row) => this.drawItem(item, row)
    );
    this.ref.detectChanges();
  }

  initHeader(): void {
    this.cols = [ ...this.ganttService.getHeader(config.MIN_COLS) ];
    const styleDecl = (this.header.nativeElement as HTMLElement).style;
    styleDecl.gridTemplateColumns = Array(this.cols.length).fill(1).map(_ => config.ONE_FR).join(' ');
    styleDecl.width =  this.cols.length <= 24 ? config.FULL_WIDTH : `${config.COLSIZE * this.cols.length}px`;
    // styleDecl.width = `${config.COLSIZE * this.cols.length}px`;
    // styleDecl.width = config.FULL_WIDTH;
  }

  private drawTask(item: GanttItemAtemporal, row: number): void {
    let color: string = config.PHASE_COLOR;
    if (item.startMonth && item.duration) {
      if (isProject(item)) {
        color = config.PROJECT_COLOR;
      }
      this.drawBar(item.id + '', row + 1, item.startMonth, item.startMonth + item.duration, item.isActive ? color : config.INACTIVE);
    }
  }

  private drawItem(item: GanttItemAtemporal, row: number): void {
    return (item.isMilestone ? this.drawMilestone : this.drawTask).call(this, item, row);
  }

  private drawBar(  taskName: string,
                    row: number,
                    start: number,
                    end: number,
                    color: string): void {
      const divTask: HTMLElement = this.renderer.createElement('div');
      divTask.style.gridColumn = `${start}/${end}`;
      divTask.style.gridRow = `${row}`;
      divTask.style.backgroundColor = `${color}`;
      divTask.style.boxSizing = 'border-box';
      divTask.style.marginTop = config.BAR_MARGIN + 'px';
      divTask.style.marginBottom = config.BAR_MARGIN + 'px';
      divTask.style.height = config.BAR_HEIGHT + 'px';
      divTask.style.borderRadius = '2px';
      this.renderer.setProperty(divTask, 'id', taskName);
      this.renderer.appendChild(this.ganttGrid.nativeElement, divTask);
    }

  private drawMilestone(item: GanttItemAtemporal, row: number): void {
    const divMilestone: HTMLElement = this.renderer.createElement('div');
    const size = config.BAR_HEIGHT * Math.SQRT1_2;
    divMilestone.style.gridColumn = `${item.startMonth}`;
    divMilestone.style.gridRow = `${row + 1}`;
    divMilestone.style.backgroundColor = item.isActive && !!item.startMonth ? config.PHASE_COLOR : config.INACTIVE;
    divMilestone.style.boxSizing = 'border-box';
    divMilestone.style.height =  `${size}px`;
    divMilestone.style.width = `${size}px`;
    divMilestone.style.transformOrigin = 'center';
    divMilestone.style.transform = `translate(-50%, 60%) rotate(45deg)`;
    this.renderer.setProperty(divMilestone, 'id', item.id);
    this.renderer.appendChild(this.ganttGrid.nativeElement, divMilestone);
  }

    getRectDimensions = (): { width: number, height: number } => ({
      width: this.cols?.length * config.COLSIZE,
      height: this.rows?.length * config.ROWSIZE
    })
}
