import {
  AfterContentChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as moment from 'moment';
import {
  GanttItemAtemporal,
  ItemsMap
} from '../../@model/gantt-item-atemporal.model';
import { TypeCodeEnum } from '../../@model/type-code.enum';
import * as ganttFn from '../../@services/gantt-atemporal-task.functions';
import { GanttAtemporalService } from '../../@services/gantt-atemporal.service';
import * as config from '../gantt.config';

interface FormValue {
  id: number;
  isActive: boolean;
  startMonth: number;
  duration: number;
  startDateMap: string;
  endDateMap: string;
}

const DATE_PATTERN = 'DD/MM/YYYY';

const stringToDate = (value: string): moment.Moment =>
  moment(value, DATE_PATTERN).isValid() ? moment(value, DATE_PATTERN) : null;

const dateToString = (value: moment.Moment): string =>
  value?.isValid() ? value.format(DATE_PATTERN) : null;

@Component({
  selector: 'lib-atemporal-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent implements OnInit, AfterContentChecked, OnDestroy {
  @ViewChild('itemsTable') itemsTable: ElementRef;
  @ViewChild('header') header: ElementRef;

  private isLocked: boolean;

  @Input() set locked(value: boolean) {
    this.isLocked = value;
  }

  get locked(): boolean {
    return !!this.isLocked;
  }

  @Input() editableTypes: Set<TypeCodeEnum>;
  @Input() atemporal: boolean;

  get headers(): { name: string; width: number; visible: boolean }[] {
    return [
      { name: 'Attività', width: 500, visible: true },
      { name: 'Attiva', width: 50, visible: true },
      { name: 'Inizio', width: 50, visible: !!this.atemporal },
      { name: 'Data Inizio', width: 100, visible: !this.atemporal },
      { name: 'Data Fine', width: 100, visible: !this.atemporal },
      { name: 'Durata', width: 50, visible: true }
    ].filter((item) => !!item.visible);
  }

  itemsSubscription: Subscription;

  mainForm: FormGroup;
  itemsForms: FormArray;

  itemsIds: number[];
  itemsMap: ItemsMap;

  colsTemplate: string;
  colsWidth: number;

  showHeader: boolean;

  constructor(
    private ganttService: GanttAtemporalService,
    private formBuilder: FormBuilder,
    private detectorRef: ChangeDetectorRef
  ) {
    this.mainForm = this.formBuilder.group({});
    this.itemsForms = this.formBuilder.array([]);
    this.mainForm.addControl('itemsForms', this.itemsForms);
  }

  ngOnInit(): void {
    this.itemsSubscription = this.ganttService
      .getItems()
      .subscribe((items) => (this.items = items));
  }

  ngAfterContentChecked(): void {
    this.colsTemplate = this.headers.map((h) => `${h.width}px`).join(' ');
    this.colsWidth = this.headers
      .map((h) => +h.width)
      .reduce((p, c) => p + c, 0);
    this.tableSetup();
  }

  ngOnDestroy(): void {
    this.itemsSubscription?.unsubscribe();
  }

  set items(itemsList: GanttItemAtemporal[]) {
    this.showHeader = !!itemsList.length;
    this.itemsMap = ganttFn.toMap(itemsList);
    this.itemsIds = itemsList.map((item) => item.id);
    this.initForms();
    this.detectorRef.detectChanges();
  }

  get items(): GanttItemAtemporal[] {
    return this.itemsIds.map((id) => this.itemsMap.get(id));
  }

  private getTaskForm(item: GanttItemAtemporal): FormGroup {
    const group = this.formBuilder.group(
      {
        id: item.id,
        isActive: item.isActive,
        startMonth: item.startMonth,
        duration: item.duration,
        startDateMap: dateToString(item.mapStartDate),
        endDateMap: dateToString(item.mapEndDate)
      },
      { updateOn: 'blur' }
    );
    if (!item.isActive) {
      group.disable({ emitEvent: false });
    }
    return group;
  }

  initForms(): void {
    this.mainForm = this.formBuilder.group({});
    this.itemsForms = this.formBuilder.array([]);
    this.mainForm.addControl('itemsForms', this.itemsForms);
    this.itemsIds.forEach((id) => {
      this.itemsForms.push(this.getTaskForm(this.itemsMap.get(id)));
    });
    this.itemsForms.valueChanges
      .pipe(tap(this.updateMap.bind(this)))
      .subscribe();
    this.tableSetup();
  }

  updateMap<T extends FormValue>(_value: any): void {
    this.itemsForms.controls.forEach((control) => {
      const value: T = control.value;
      const id = Number(value.id);
      const item = this.itemsMap.get(id);
      if (item) {
        const _item = { ...item };
        const adjustStartMonth =
          control.get('duration')?.dirty && !+value.startMonth;
        _item.startMonth = adjustStartMonth
          ? 1
          : ganttFn.fixNegativeOrDecimalValue(+value.startMonth);
        _item.duration = ganttFn.fixNegativeOrDecimalValue(+value.duration);
        _item.mapStartDate = stringToDate(value.startDateMap);
        _item.mapEndDate = item.isMilestone
          ? stringToDate(value.startDateMap)
          : stringToDate(value.endDateMap);
        /** SET MANUAL FLAGS */
        _item.endDateManual = !!control.get('endDateMap')?.dirty;
        _item.startMonthManual = !!control.get('startMonth')?.dirty;
        _item.startDateManual = !!control.get('startDateMap')?.dirty;
        _item.durationManual = !!control.get('duration')?.dirty;
        this.itemsMap.set(id, _item);
      }
    });
    this.ganttService.updateMapItems(this.itemsMap, this.atemporal);
  }

  isMilestone = (index: number): boolean =>
    this.getItemAtIndex(index)?.isMilestone;

  isPhase = (index: number): boolean =>
    ganttFn.isPhase(this.getItemAtIndex(index));

  getItemAtIndex = (index: number): GanttItemAtemporal =>
    this.itemsMap.get(this.itemsIds[index]);

  showActivation = (index: number): boolean =>
    !this.isReadonly(index) && this.isPhase(index);

  isActive = (index: number): boolean => this.getItemAtIndex(index)?.isActive;

  onActivationToggle(index: number): void {
    this.ganttService.toggleActivation(this.itemsIds[index]);
  }

  disableWhenZero(event: any, i: number) {
    if (event.target.value === '0') {
      this.getItemAtIndex(i).duration = 0;
      this.getItemAtIndex(i).startMonth = 0;
      this.onActivationToggle(i);
    }
  }

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
    `gantt-item--level-${this.getItemAtIndex(index)?.level || 0}`;

  getStartMonth(index: number): number {
    return this.getItemAtIndex(index)?.startMonth;
  }

  getDuration(index: number): number {
    return this.getItemAtIndex(index)?.duration;
  }

  getStartDateMap = (index: number): string => {
    const startDate = this.getItemAtIndex(index)?.mapStartDate;
    return startDate ? dateToString(startDate) : null;
  };

  getEndDateMap = (index: number): string => {
    const endDate = this.getItemAtIndex(index)?.mapEndDate;
    return endDate ? dateToString(endDate) : null;
  };

  isReadonly(index: number): boolean {
    const typeCode = this.getItemAtIndex(index)?.typeCode;
    const editable =
      !!this.editableTypes?.has(TypeCodeEnum[typeCode]) ||
      typeCode === 'NR_PROJECT';
    return this.locked || !editable;
  }

  isProject(index: number): boolean {
    const level = this.getItemAtIndex(index)?.level;
    return level === 0;
  }

  isLockedByConstraint(index: number): boolean {
    const typeCode = this.getItemAtIndex(index)?.typeCode;
    return this.ganttService.lockedTypeCodes?.has(typeCode);
  }

  getItemName(index: number): string {
    const name = this.getItemAtIndex(index).name;
    return name.length < 60 ? name : `${name.substring(0, 57)}...`;
  }
}
