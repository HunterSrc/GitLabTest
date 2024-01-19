import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GanttItemTemporal, ItemsMap } from '../../@model/gantt-item-temporal.model';
import { TypeCodeEnum } from '../../@model/type-code.enum';
import * as ganttFn from '../../@services/gantt-temporal-task.functions';
import { isCommission, isProject } from '../../@services/gantt-temporal-task.functions';
import { GanttTemporalService } from '../../@services/gantt-temporal.service';
import * as config from '../gantt.config';

interface FormValue {
  id: number;
  isActive: boolean;
  startDateBaseline: string;
  endDateBaseline: string;
}

@Component({
  selector: 'lib-temporal-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() locked: boolean;
  @Input() editableTypes: Set<TypeCodeEnum>;

  itemsSubscription: Subscription;

  headers = [
    { name: 'Attività' , width: 500 },
    { name: 'Attiva' , width: 50 },
    { name: 'Inizio Pianificato', width: 100 },
    { name: 'Fine Pianificata', width: 100 }
  ];

  colsTemplate = this.headers.map(h => h.width + 'px').join(' ');
  colsWidth = this.headers.map(h => +h.width).reduce((p, c) => p + c, 0);

  mainForm: FormGroup;
  itemsForms: FormArray;

  itemsIds: number[];
  itemsMap: ItemsMap;

  @ViewChild('itemsTable') itemsTable: ElementRef;
  @ViewChild('header') header: ElementRef;

  constructor(private ganttService: GanttTemporalService, private formBuilder: FormBuilder, private ref: ChangeDetectorRef) {
    this.mainForm  = this.formBuilder.group({});
    this.itemsForms = this.formBuilder.array([]);
    this.mainForm.addControl('itemsForms', this.itemsForms);
  }

  ngOnInit(): void {
    this.itemsSubscription = this.ganttService.getItems().subscribe(items => this.items = items);
  }

  ngAfterViewInit(): void {
    this.tableSetup();
  }

  ngOnDestroy(): void{
    this.itemsSubscription?.unsubscribe();
  }

  set items(itemsList: GanttItemTemporal[]) {
    this.itemsMap = ganttFn.toMap(itemsList);
    this.itemsIds = itemsList.map(item => item.id);
    this.initForms();
  }

  get items(): GanttItemTemporal[] {
    return this.itemsIds.map(id => this.itemsMap.get(id));
  }

  private getTaskForm(item: GanttItemTemporal): FormGroup {
    const dateToString = (value: moment.Moment): string | null => value?.isValid() ? value.format('DD/MM/YYYY') : null;
    const group = this.formBuilder.group(
      {
        id: item.id,
        isActive: item.isActive,
        startDateBaseline: dateToString(item.baselineStartDate as moment.Moment),
        endDateBaseline: dateToString(item.baselineEndDate as moment.Moment),
      }, { updateOn: 'blur' }
    );
    if (!item.isActive) {
      group.disable({ emitEvent: false});
    }
    return group;
  }

  initForms(): void {
    this.mainForm  = this.formBuilder.group({});
    this.itemsForms = this.formBuilder.array([]);
    this.mainForm.addControl('itemsForms', this.itemsForms);
    this.itemsIds.forEach( id => {
      this.itemsForms.push(this.getTaskForm(this.itemsMap.get(id)));
    });
    this.tableSetup();
    this.itemsForms.valueChanges.pipe(
      // debounceTime(500),
      tap(this.updateMap.bind(this))
    ).subscribe();
  }

  updateMap<T extends FormValue>(_value: any): void {
    const stringToDate = (value: string): moment.Moment => moment(value, 'DD/MM/YYYY').isValid() ? moment(value, 'DD/MM/YYYY') : null;
    this.itemsForms.controls.forEach(control => {
      const value: T = control.value;
      const id: number = Number(value.id);
      const item = this.itemsMap.get(id);
      if (item) {
        const _item = { ...item };
        _item.baselineStartDate = stringToDate(value.startDateBaseline);
        _item.baselineEndDate = item.isMilestone ? stringToDate(value.startDateBaseline) : stringToDate(value.endDateBaseline);
        this.itemsMap.set(id, _item);
      }
    });
    this.ganttService.updateMapItems(this.itemsMap);
  }

  isMilestone = (index: number): boolean => this.getItemAtIndex(index)?.isMilestone;

  isReadonly = (index: number): boolean => {
    const item = this.getItemAtIndex(index);
    const editable = !!this.editableTypes?.has(TypeCodeEnum[this.getItemAtIndex(index)?.typeCode]);
    const isProjectOrCommission = item && (isProject(item) || isCommission(item));
    return this.locked ||  !editable || isProjectOrCommission;
  }

  getItemAtIndex = (index: number): GanttItemTemporal => this.itemsMap.get(this.itemsIds[index]);

  showActivation = (index: number): boolean => !this.isReadonly(index) && ganttFn.isPhase(this.getItemAtIndex(index));

  onActivationToggle(index: number): void {
    this.ganttService.toggleActivation(this.itemsIds[index]);
  }

  tableSetup(): void {
    if (this.itemsTable && this.header) {
      const tableStyle: CSSStyleDeclaration = (this.itemsTable.nativeElement as HTMLElement).style;
      tableStyle.minWidth = this.colsWidth + 'px';
      tableStyle.height = this.itemsIds?.length * config.ROWSIZE + 'px';
      tableStyle.gridTemplateRows = this.itemsIds?.map(_ => config.ONE_FR).join(' ');
      tableStyle.gridTemplateColumns = this.colsTemplate;

      const styleDeclHeader = (this.header.nativeElement as HTMLElement).style;
      styleDeclHeader.minWidth = this.colsWidth + 'px';
      styleDeclHeader.gridTemplateColumns = this.colsTemplate;
    }
  }

  getPadding = (index: number): string => `gantt-item--level-${this.getItemAtIndex(index)?.level || 0 }`;

  getItemName(index: number): string {
    const name = this.getItemAtIndex(index).code;
    return name.length < 60 ? name : `${name.substring(0, 57)}...`;
  }

}
