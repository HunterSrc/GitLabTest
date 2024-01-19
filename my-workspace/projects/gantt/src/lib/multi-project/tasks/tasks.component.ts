import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import {
  GanttItemMultiProject,
  ItemsMap
} from '../../@model/gantt-item-multiproject.model';
import { TypeCodeEnum } from '../../@model/type-code.enum';
import * as ganttFn from '../../@services/gantt-multiproject-task.functions';
import { GanttMultiProjectService } from '../../@services/gantt-multiproject.service';
import * as config from '../gantt.config';

interface FormValue {
  id: number;
  isActive: boolean;
  startDateMap: string;
  endDateMap: string;
  startDatePlanned: string;
  endDatePlanned: string;
  progress: number;
}

const equalsValues = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const sortItems = (i1: GanttItemMultiProject, i2: GanttItemMultiProject) =>
  i1.level !== i2.level ? i1.level - i2.level : i1.order - i2.order;

@Component({
  selector: 'lib-multi-project-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, AfterViewInit, OnDestroy {
  headers = [
    { name: 'Attività', width: 300 },
    { name: 'Inizio ultimo MAP autorizzato', width: 100 },
    { name: 'Fine ultimo MAP autorizzato', width: 100 },
    { name: 'Inizio effettivo', width: 100 },
    { name: 'Fine effettiva', width: 100 },
    { name: 'Inizio Forecast', width: 100 },
    { name: 'Fine Forecast', width: 100 },
    { name: 'Progress', width: 100 },
    { name: 'Peso', width: 100 }
  ];

  colsTemplate = this.headers.map((h) => `${h.width}px`).join(' ');
  colsWidth = this.headers.map((h) => +h.width).reduce((p, c) => p + c, 0);

  mainForm: FormGroup;
  itemsForms: FormArray;

  itemsIds: number[];
  itemsMap: ItemsMap;
  @Input() isNominativa = !!true;

  modifiedIds: Set<number> = new Set();

  itemsSubscription: Subscription;

  private editablePlannedDates: Map<number, number[]> = new Map();

  @ViewChild('itemsTable') itemsTable: ElementRef;
  @ViewChild('header') header: ElementRef;
  @Input() locked: boolean;
  @Input() editableTypes: Set<TypeCodeEnum>;

  constructor(
    private ganttProjectService: GanttMultiProjectService,
    private formBuilder: FormBuilder
  ) {
    this.mainForm = this.formBuilder.group({});
    this.itemsForms = this.formBuilder.array([]);
    this.mainForm.addControl('itemsForms', this.itemsForms);
  }

  ngOnInit(): void {
    this.itemsSubscription = this.ganttProjectService
      .getItems()
      .subscribe((items) => (this.items = items));
  }

  ngAfterViewInit(): void {
    this.tableSetup();
  }

  ngOnDestroy(): void {
    this.itemsSubscription?.unsubscribe();
  }

  set items(itemsList: GanttItemMultiProject[]) {
    this.itemsMap = ganttFn.toMap(itemsList);
    const projectId = ganttFn.getProject(itemsList)?.id;
    const orderedList = ganttFn
      .sort(itemsList, projectId, this.itemsMap)
      .filter((e) => !!e);
    this.itemsIds = orderedList.map((item) => item?.id);
    this.initForms();
  }

  get items(): GanttItemMultiProject[] {
    return this.itemsIds.map((id) => this.itemsMap.get(id));
  }

  private getTaskForm(item: GanttItemMultiProject): FormGroup {
    const dateToString = (value: moment.Moment): string | null =>
      value?.isValid() ? value.format('DD/MM/YYYY') : null;
    const group = this.formBuilder.group(
      {
        id: item.id,
        startDateActual: dateToString(item.actualStartDate as moment.Moment),
        endDateActual: dateToString(item.actualEndDate as moment.Moment),
        lastReauthStartDate: dateToString(
          item.lastReauthStartDate as moment.Moment
        ),
        lastReauthEndDate: dateToString(
          item.lastReauthEndDate as moment.Moment
        ),
        startDateForecast: dateToString(
          item.forecastStartDate as moment.Moment
        ),
        endDateForecast: dateToString(item.forecastEndDate as moment.Moment),
        progress: item.progress,
        peso: item.weight
      },
      { updateOn: 'blur' }
    );
    return group;
  }

  initForms(): void {
    this.mainForm = this.formBuilder.group({});
    this.itemsForms = this.formBuilder.array([]);
    this.mainForm.addControl('itemsForms', this.itemsForms);
    this.itemsIds.forEach((id) => {
      this.itemsForms.push(this.getTaskForm(this.itemsMap.get(id)));
    });
    this.tableSetup();
  }

  updateMap<T extends FormValue>(_value: any): void {
    const stringToDate = (value: string): moment.Moment =>
      moment(value, 'DD/MM/YYYY').isValid()
        ? moment(value, 'DD/MM/YYYY')
        : null;
    this.itemsForms.controls.forEach((control) => {
      const value: T = control.value;
      const id = Number(value.id);
      const item = { ...this.itemsMap.get(id) };
      if (control.dirty) {
        this.modifiedIds.add(id);
      }
      item.mapStartDate = stringToDate(value.startDateMap);
      item.mapEndDate = stringToDate(value.endDateMap);
      item.progress = +value.progress;
      this.itemsMap.set(id, item);
    });
    this.ganttProjectService.updateMapItems(this.itemsMap);
  }

  getItemAtIndex = (index: number): GanttItemMultiProject =>
    this.itemsMap.get(this.itemsIds[index]);

  tableSetup(): void {
    if (this.itemsTable && this.header) {
      const tableStyle: CSSStyleDeclaration = (
        this.itemsTable.nativeElement as HTMLElement
      ).style;
      tableStyle.minWidth = `${this.colsWidth}px`;
      tableStyle.height = `${this.itemsIds?.length * config.ROWSIZE}px`;
      tableStyle.gridTemplateRows = this.itemsIds
        ?.map((_) => config.ONE_FR)
        .join(' ');
      tableStyle.gridTemplateColumns = this.colsTemplate;

      const styleDeclHeader = (this.header.nativeElement as HTMLElement).style;
      styleDeclHeader.minWidth = `${this.colsWidth}px`;
      styleDeclHeader.gridTemplateColumns = this.colsTemplate;
    }
  }

  getPadding = (index: number): string =>
    `gantt-item--level-${this.getItemAtIndex(index)?.level}`;
  getWidth = (index: number): string =>
    `activity-gantt-item--level-${this.getItemAtIndex(index)?.level - 1 || 0}`;

  isReadonly(index: number): boolean {
    const item: GanttItemMultiProject = this.getItemAtIndex(index);
    return !(item && this.editableTypes?.has(TypeCodeEnum[item.typeCode]));
  }

  getRectDimensions = (): { width: number; height: number } => ({
    width: this.headers.reduce((p, c) => p + c.width, 0),
    height: (this.itemsIds.length + 1) * config.ROWSIZE
  });

  private isEditableDatePlanned = (index: number, isEnd = false): boolean => {
    const item = this.getItemAtIndex(index);
    if (item) {
      if (item.level === 0) {
        return false;
      }
      return this.editablePlannedDates.get(item.id)
        ? !!this.editablePlannedDates.get(item.id)[+isEnd]
        : false;
    }
    return false;
  };

  isCollapsable = (index: number): boolean =>
    this.isNominativa && this.getItemAtIndex(index)?.collapsable;
  isCollapsed = (index: number): boolean =>
    this.getItemAtIndex(index)?.collapsed;

  onCollapseToggle(index: number): void {
    this.ganttProjectService.toggleCollapse(this.itemsIds[index]);
  }

  isMultiproject(index: number): boolean {
    return this.getItemAtIndex(index)?.level === 0;
  }

  showForecastDates(index: number): boolean {
    const item = this.getItemAtIndex(index);
    return item?.level > 1
      ? !!item?.isActive ||
          (!!item?.forecastStartDate?.isValid() &&
            !!item?.forecastEndDate?.isValid())
      : true;
  }

  isCompleted(index: number) {
    const item = this.getItemAtIndex(index);
    return !!item && item.progress === 100;
  }
}
