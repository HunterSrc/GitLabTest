import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DateType, Editable, GanttItem, ItemsMap } from '../../@model/gantt-item-project.model';
import { TypeCodeEnum } from '../../@model/type-code.enum';
import * as ganttFn from '../../@services/gantt-project-task.function';
import { GanttProjectService, sortItems } from '../../@services/gantt-project.service';
import * as config from '../gantt.config';

interface FormValue {
  id: number;
  isActive: boolean;
  mapStartDate: string;
  mapEndDate: string;
  plannedStartDate: string;
  plannedEndDate: string;
  delay: number;
  progress: number;
}

const equalsValues = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const dateValidator = (date: moment.Moment): ValidationErrors => {
  if (!!date?.isValid()) {
    if (date.isBefore(moment(), 'day')) {
      return { past: true };
    }
  } else {
    return { invalid: true };
  }
};

const rangeValidator = (start, end: moment.Moment): ValidationErrors =>  (end.isBefore(start) ? { invalidInterval: true} : {});

const dateControlValidator = (control: FormControl): ValidationErrors => {
  if (control.dirty) {
    return dateValidator(moment(control?.value || null, 'DD/MM/YYYY'));
  }
};

const formValidator = (control: FormGroup): ValidationErrors => {
  const start = control.get('plannedStartDate');
  const end = control.get('plannedEndDate');
  const mtStart = moment(start?.value, 'DD/MM/YYYY');
  const mtEnd = moment(end?.value, 'DD/MM/YYYY');

  let err: ValidationErrors = {};

  if (end.hasError('past')) {
    err = { ...err, pastEnd: true };
  }
  if (start.hasError('past')) {
    err = { ...err, pastStart: true };
  }
  if (start?.dirty) {
    if (!mtStart?.isValid()) {
      err = { ...err, invalidDates: true };
    }
  }
  if (end?.dirty) {
    if (!mtEnd?.isValid()) {
      err = { ...err, invalidDates: true };
    }
  }

  if (mtStart?.isValid() && mtEnd?.isValid()) {
      err =  { ...err, ...rangeValidator(mtStart, mtEnd)};
  }

  return err;
};

@Component({
  selector: 'lib-project-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, AfterViewInit, OnDestroy {

  headers = [
    { name: 'Attività', width: 300 },
    { name: 'Inizio (ultimo MAP autorizzato)', width: 100 },
    { name: 'Fine (ultimo MAP autorizzato)', width: 100 },
    { name: 'Nuova Data Inizio Pianificata/Effettiva', width: 100 },
    { name: 'Nuova Data Fine Pianificata/Effettiva', width: 100 },
    { name: 'Progress', width: 100 },
    { name: 'Scostamento vs. MAP', width: 100 },
  ];

  colsTemplate = this.headers.map(h => h.width + 'px').join(' ');
  colsWidth = this.headers.map(h => +h.width).reduce((p, c) => p + c, 0);

  mainForm: FormGroup;
  itemsForms: FormArray;

  itemsIds: number[];
  itemsMap: ItemsMap;

  itemsSubscription: Subscription;

  private editablePlannedDates: Map<number, number[]> = new Map();

  @ViewChild('itemsTable') itemsTable: ElementRef;
  @ViewChild('header') header: ElementRef;
  @Input() locked: boolean;
  @Input() editableTypes: Set<TypeCodeEnum>;

  constructor(
    private ganttProjectService: GanttProjectService,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder) {
    this.mainForm = this.formBuilder.group({});
    this.itemsForms = this.formBuilder.array([]);
    this.mainForm.addControl('itemsForms', this.itemsForms);
  }

  ngOnInit(): void {
    this.itemsSubscription = this.ganttProjectService.getItems().subscribe(items => this.items = items);
  }

  ngAfterViewInit(): void {
    this.tableSetup();
  }

  ngOnDestroy(): void {
    this.itemsSubscription?.unsubscribe();
  }

  set items(itemsList: GanttItem[]) {
    const orderedList = itemsList.sort(sortItems);
    this.itemsMap = ganttFn.toMap(orderedList);
    this.itemsIds = orderedList.map(item => item.id);
    this.initForms();
  }

  get items(): GanttItem[] {
    return this.itemsIds.map(id => this.itemsMap.get(id));
  }

  private getTaskForm(item: GanttItem): FormGroup {
    const dateToString = (value: moment.Moment): string | null => value?.isValid() ? value.format('DD/MM/YYYY') : null;
    const group = this.formBuilder.group(
      {
        id: item.id,
        mapStartDate: dateToString(item.mapStartDate as moment.Moment),
        mapEndDate: dateToString(item.mapEndDate as moment.Moment),
        plannedStartDate: [dateToString(item.plannedStartDate?.value as moment.Moment), dateControlValidator],
        plannedEndDate: [dateToString(item.plannedEndDate?.value as moment.Moment), dateControlValidator],
        progress: item.progress,
        delay: item.delay
      }, { updateOn: 'blur', validators: formValidator }
    );
    const editable = [
      +(item.plannedStartDate?.editable && !this.ganttProjectService.hasConstraint(item)),
      +item.plannedEndDate?.editable
    ];
    this.editablePlannedDates.set(item.id, editable);
    if (!item.isActive) {
      group.disable({ emitEvent: false });
    }
    return group;
  }

  initForms(): void {
    this.mainForm = this.formBuilder.group({});
    this.itemsForms = this.formBuilder.array([]);
    this.mainForm.addControl('itemsForms', this.itemsForms);
    this.itemsIds.forEach(id => {
      this.itemsForms.push(this.getTaskForm(this.itemsMap.get(id)));
    });
    this.tableSetup();
    this.itemsForms.valueChanges.pipe(
      distinctUntilChanged(equalsValues),
      tap(this.updateMap.bind(this))
    ).subscribe();
  }

  resetErrors(control: AbstractControl): void {
    control.setErrors(null);
    control.get('plannedEndDate')?.setErrors(null);
    control.get('plannedStartDate')?.setErrors(null);
    control.markAsPristine();
  }

  checkControl(control: AbstractControl): void {
    if (control.dirty && control.invalid) {
      let errorStr = '';
      if (control.hasError('pastStart')) {
        errorStr = 'E\' stata inserita una data di inizio precedente alla data odierna';
      }
      if (control.hasError('pastEnd')) {
        errorStr = 'E\' stata inserita una data di fine precedente alla data odierna';
      }
      if (control.hasError('invalidDates')) {
        errorStr = 'E\' stata inserita una data non valida';
      }
      if (control.hasError('invalidInterval')) {
        errorStr = 'E\' stato inserito un intervallo di date non valido';
      }
      this.snackBar.open(errorStr, 'Chiudi');
      this.resetErrors(control);
    }
  }

  updateMap<T extends FormValue>(_value: any): void {
    const stringToDate = (value: string): moment.Moment => moment(value, 'DD/MM/YYYY').isValid() ? moment(value, 'DD/MM/YYYY') : null;
    this.snackBar.dismiss();
    let slavesToUpdate: Set<string>=new Set<string>();
    this.itemsForms.controls.forEach(control => {
      const value: T = control.value;
      const id: number = Number(value.id);
      const item = { ...this.itemsMap.get(id) };
      item.plannedStartDate.value = stringToDate(value.plannedStartDate);
      item.plannedEndDate.value = stringToDate(value.plannedEndDate);
      if (control.valid) {
        if(control.dirty){
          for(const slaveToUpdate of this.ganttProjectService.getSlaves(item)){
            slavesToUpdate.add(slaveToUpdate);
            //Se sto modificando un legame che è sia slave che master devo aggiornare anche il corrispondente slave
            const slaveAlsoMaster = this.ganttProjectService.getSlaveAlsoMaster(slaveToUpdate)
            if(!!slaveAlsoMaster){
              for(let value of slaveAlsoMaster){
                slavesToUpdate.add(value)
              }
            }
          }
        }
        item.mapStartDate = stringToDate(value.mapStartDate);
        item.mapEndDate = stringToDate(value.mapEndDate);
        item.progress = +value.progress;
        item.delay = +value.delay;
        this.itemsMap.set(id, item);
      } else {
        if (item.isActive) {
          this.checkControl(control);
        }
      }
    });
    this.ganttProjectService.updateMapItems(this.itemsMap, slavesToUpdate);
  }

  getItemAtIndex = (index: number): GanttItem => this.itemsMap.get(this.itemsIds[index]);

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

  getPadding = (index: number): string => `gantt-item--level-${this.getItemAtIndex(index)?.level}`;

  isReadonly(index: number): boolean {
    const item: GanttItem = this.getItemAtIndex(index);
    return !(item.isActive && (item && this.editableTypes?.has(TypeCodeEnum[item.typeCode])));
  }

  getRectDimensions = (): { width: number, height: number } => ({
    width: this.headers.reduce((p, c) => p + c.width, 0),
    height: (this.itemsIds.length + 1) * config.ROWSIZE
  })

  private isEditableDatePlanned = (index: number, isEnd: boolean = false): boolean => {
    const item = this.getItemAtIndex(index);
    if (!!item?.isActive) {
      if (item.level === 0) {
        return false;
      }
      return !!this.editablePlannedDates.get(item.id) ? !!this.editablePlannedDates.get(item.id)[+isEnd] : false;
    }
    return false;
  }

  isEditableStartDatePlanned = (index: number): boolean => this.isEditableDatePlanned(index);
  isEditableEndDatePlanned = (index: number): boolean => this.isEditableDatePlanned(index, true);

  getItemName(index: number): string {
    const name = this.getItemAtIndex(index).name;
    return name.length < 45 ? name : `${name.substring(0, 40)}...`;
  }

  saveDisbaled(): boolean {
    return !!this.validateMap().length;
  }

  private validateMap(): any[] {
    const checkDate = (date: Editable<DateType>) => !!date?.editable && dateValidator(date?.value as moment.Moment);
    const checkValidTemporal = (start: moment.Moment, end: moment.Moment): boolean => {
      if (!!start?.isValid() && end?.isValid() && start.isSameOrBefore(end, 'day')){
        return false;
      }else{
        return true;
      }
    };
    return [...(this.itemsMap.values() || [])]
    .map(value => value.isActive && (checkDate(value?.plannedStartDate) || checkDate(value?.plannedEndDate) || checkValidTemporal(value?.plannedStartDate?.value as moment.Moment, value?.plannedEndDate?.value as moment.Moment)))
    .filter(v => !!v);
  }

  hasError(index: number): boolean {
    const item: GanttItem = this.getItemAtIndex(index);
    if (!!item?.isActive && (item?.plannedStartDate?.editable && item?.plannedEndDate?.editable)) {
      const start = item?.plannedStartDate?.value as moment.Moment;
      const end = item?.plannedEndDate?.value as moment.Moment;
      let error = { ...dateValidator(start), ...dateValidator(end)};
      if (start?.isValid() && end?.isValid()) {
        error = { ...error, ...rangeValidator(start, end)};
      }
      return !!Object.keys(error).length;
    }
    return false;
  }
}
