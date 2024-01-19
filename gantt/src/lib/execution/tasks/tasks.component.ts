import { AfterContentChecked, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, tap } from 'rxjs/operators';
import { GanttColumnsEnum, GanttColumnsType, HEADERS, IColumnHeader } from '../../@model/enums.model';
import { GanttItemExecution, ItemsMap } from '../../@model/gantt-item-execution.model';
import { DateType } from '../../@model/gantt-item-project.model';
import { isMoment } from '../../@model/gantt-item.mapper';
import { TypeCodeEnum } from '../../@model/type-code.enum';
import * as ganttFn from '../../@services/gantt-execution-task.functions';
import { GanttExecutionService } from '../../@services/gantt-execution.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { AssignDialogComponent } from '../assign-dialog/assign-dialog.component';
import { AddPermissionComponent } from '../add-permission-dialog/add-permission-dialog.component';
import * as config from '../gantt.config';
import { URLS } from 'projects/mon-impianti/src/app/@services/urls.constants';

interface FormValue {
  id: number;
  isActive: boolean;
  baselineStartDate: string;
  baselineEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  forecastStartDate: string;
  forecastEndDate: string;
  progress: number;
  weight: number;
}

const equalsValues = (a, b) => JSON.stringify(a) === JSON.stringify(b);

@Component({
  selector: 'lib-execution-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, AfterContentChecked, OnDestroy {
  colsTemplate: string;
  colsWidth: number;

  headers: IColumnHeader[] = [];

  private columns: Set<GanttColumnsType> = new Set();
  get availableColumns(): GanttColumnsType[] {
    return [...this.columns];
  }
  @Input() set availableColumns(_availableColumns: GanttColumnsType[]) {
    const availableColumns: GanttColumnsType[] = _availableColumns?.length
      ? [..._availableColumns]
      : config.DEFAULT_COLUMNS as GanttColumnsType[];
    this.columns = new Set(availableColumns);
    this.headers = HEADERS.filter((e, i: number) => availableColumns ? availableColumns.includes(e.name) : true);
    this.colsTemplate = this.headers.map(h => h.width + 'px').join(' ');
    this.colsWidth = this.headers.map(h => +h.width).reduce((p, c) => p + c, 0);
  }

  get GanttColumnsEnum(): typeof GanttColumnsEnum {
    return GanttColumnsEnum;
  }

  mainForm: FormGroup;
  itemsForms: FormArray;

  itemsIds: number[];
  itemsMap: ItemsMap;
  showHeader: boolean;
  commissionCode: string;

  private _current: number = null;

  modifiedIds: Set<number> = new Set();
  hilightIds: Set<number> = new Set();

  itemsSubscription: Subscription;

  @ViewChild('itemsTable') itemsTable: ElementRef;
  @ViewChild('header') header: ElementRef;
  @Input() locked: boolean;
  @Input() set currentId(input: number[]) {
    if (input.length && this._current == null) {
      this._current = input[0];
    }
  }
  @Input() editableTypes: Set<TypeCodeEnum>;
  @Input() isNominativa = !!true;

  @Input() showZeroWeightRows = true;
  @Output() saveGantt = new EventEmitter();
  @Output() associa = new EventEmitter();
  @Output() creaPermessi = new EventEmitter();

  constructor(
    private ganttExecutionService: GanttExecutionService,
    private formBuilder: FormBuilder,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.mainForm  = this.formBuilder.group({});
    this.itemsForms = this.formBuilder.array([]);
    this.mainForm.addControl('itemsForms', this.itemsForms);
  }

  ngOnInit(): void {
    this.itemsSubscription = this.ganttExecutionService.getItems().subscribe(items => this.items = items);
  }

  ngAfterContentChecked(): void {
    this.tableSetup();
  }

  ngOnDestroy(): void {
    this.itemsSubscription?.unsubscribe();
  }

  set items(itemsList: GanttItemExecution[]) {
    this.itemsMap = ganttFn.toMap(itemsList);
    this.itemsIds = itemsList.map(item => item.id);
    if (!this.commissionCode) {
      this.commissionCode = itemsList.find(ganttFn.isCommission)?.name;
    }
    this.initForms();
  }

  get items(): GanttItemExecution[] {
    return this.itemsIds.map(id => this.itemsMap.get(id));
  }

  private getTaskForm(item: GanttItemExecution): FormGroup {
    const dateToString = (value: DateType): string | null => isMoment(value) && !!value?.isValid() ? value.format('DD/MM/YYYY') : null;
    const group = this.formBuilder.group(
      {
        id: item.id,
        isActive: item.isActive,
        baselineStartDate: dateToString(item.baselineStartDate),
        baselineEndDate: dateToString(item.baselineEndDate),
        actualStartDate: dateToString(item.actualStartDate),
        actualEndDate: dateToString(item.actualEndDate),
        forecastStartDate: dateToString(item.forecastStartDate),
        forecastEndDate: dateToString(item.forecastEndDate),
        progress: item.progress,
        weight: item.weight,
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
    this.showHeader = !!this.itemsIds?.length;
    this.mainForm.addControl('itemsForms', this.itemsForms);
    this.itemsIds.forEach( id => {
      this.itemsForms.push(this.getTaskForm(this.itemsMap.get(id)));
    });
    this.tableSetup();
    this.itemsForms.valueChanges.pipe(
      distinctUntilChanged(equalsValues),
      tap(this.updateMap.bind(this))
    ).subscribe();
  }

  updateMap<T extends FormValue>(_value: any): void {
    const stringToDate = (value: string): moment.Moment => moment(value, 'DD/MM/YYYY').isValid() ? moment(value, 'DD/MM/YYYY') : null;
    this.itemsForms.controls.forEach(control => {
      const value: T = control.value;
      const id: number = Number(value.id);
      const item = { ...this.itemsMap.get(id) };
      // TODO Riabilitare quando il be sarà allineato
      // if (control.dirty) {
      this.modifiedIds.add(id);
      // }
      
      if(!this.isNominativa){
        //se la commessa è di tipo vario: inserire logiche per date pianificate e forecast
        item.baselineStartDate = stringToDate(value.baselineStartDate);
        //per messa in esercizio inizio baseline è sempre uguale a fine baseline
        if(item.typeCode === TypeCodeEnum.ENTRY_INTO_SERVICE)
          item.baselineEndDate = stringToDate(value.baselineStartDate);
        else
          item.baselineEndDate = stringToDate(value.baselineEndDate);
  
        //controllo che inizio e fine non siano null, altrimenti metto alla data di oggi
        let today = moment().startOf('day');
        if(item.baselineStartDate == null){
          item.baselineStartDate = today;
        }
  
        if(item.baselineEndDate == null){
          item.baselineEndDate = today;
        }
  
        //controllo che inizio e fine siano > dataBuas, altrimenti metto la data di buas     
        let buasDate = this.ganttExecutionService.getBuasDate();
        if(item.baselineStartDate < buasDate){
          item.baselineStartDate = buasDate;
        }
        
        if(item.baselineEndDate < buasDate){
          item.baselineEndDate = buasDate;
        }
  
        //controllo che inizio > fine, altrimenti aggiorno la fine alla data di inizio
        if(item.baselineStartDate > item.baselineEndDate){
          item.baselineEndDate = item.baselineStartDate;
        }
  
      }else{
        item.baselineStartDate = stringToDate(value.baselineStartDate);
        item.baselineEndDate = stringToDate(value.baselineEndDate);  
      }

      item.actualStartDate = stringToDate(value.actualStartDate);
      item.actualEndDate = stringToDate(value.actualEndDate);
      item.forecastStartDate = stringToDate(value.forecastStartDate);
      item.forecastEndDate = stringToDate(value.forecastEndDate);
      item.progress = ganttFn.fixOutOfBoundValue(+value.progress);
      item.weight = ganttFn.fixOutOfBoundValue(+value.weight);
      this.itemsMap.set(id, item);
    });
    this.ganttExecutionService.updateMapItems(this.itemsMap);
  }

  getItemAtIndex = (index: number): GanttItemExecution => this.itemsMap.get(this.itemsIds[index]);

  isCollapsable = (index: number): boolean => this.getItemAtIndex(index)?.collapsable;

  isCollapsed = (index: number): boolean => this.getItemAtIndex(index)?.collapsed;

  isCurrent = (index: number): boolean => this.itemsIds[index] === this._current;

  onCollapseToggle(index: number): void {
    this.ganttExecutionService.toggleCollapse(this.itemsIds[index]);
  }

  onCloseBatch(index: number): void {
    this.ganttExecutionService.closeBatch(this.itemsIds[index]);
  }

  showActivation = (index: number): boolean =>
    !this.isReadonly(index) && this.hasBaseline(index) && !this.isStarted(index)

  showForecastDates(index: number): boolean {
    const item = this.itemsMap.get(this.itemsIds[index]);
    return ganttFn.isProject(item) || ganttFn.isCommission(item) || (ganttFn.isPhase(item) && !!item?.isActive);
  }

  showCloseBatchAction = (index: number): boolean =>
    !this.isReadonly(index) && ganttFn.isBatchClosable(this.getItemAtIndex(index))

  onActivationToggle(index: number): void {
    const item = this.getItemAtIndex(index);
    this.ganttExecutionService.toggleActivation(this.itemsIds[index]);
    if (!!item && item?.level === 2) {
      this.dialog
        .open(ConfirmDialogComponent, { data: { phaseName: item.name,  activate: !item.isActive, commissionCode: this.commissionCode }})
        .afterClosed().subscribe(result => {
          if (!!result) {
            this.saveGantt.emit('save');
          } else {
            this.ganttExecutionService.restoreActivationBackup(item.id);
          }
        });
    }
  }

  showAssociateAction = (index: number): boolean =>{
    const item: GanttItemExecution = this.getItemAtIndex(index);
    return !this.isReadonly(index) && ganttFn.isBatchAssociable(this.ganttExecutionService.getParentItem(item));
  }

  onAssociationToggle(index: number): void {
    const item = this.getItemAtIndex(index);
    if (!!item && item?.level === 4) {
      this.dialog
        .open(AssignDialogComponent, { data: { phaseName: item.name, commissionCode: this.commissionCode }})
        .afterClosed().subscribe(result => {
          if (!!result){
            const contrattiPerFornituraId = this.ganttExecutionService.getContrattiPerFornituraId();
            const garePerFornituraId = this.ganttExecutionService.getGarePerFornituraId();
            const costruzioneId = this.ganttExecutionService.getCostruzioneId();
            this.associa.emit(item.subjectDetail + URLS.associa(garePerFornituraId, contrattiPerFornituraId, costruzioneId));
          }else{
          }
        });
    }
  }

  tableSetup(): void {
    const rowSize = this.isNominativa ? config.ROWSIZE : config.ROWSIZE_SMALL;
    if (this.itemsTable && this.header) {
      const tableStyle: CSSStyleDeclaration = (this.itemsTable.nativeElement as HTMLElement).style;
      tableStyle.minWidth = this.colsWidth + 'px';

      const items = this.itemsIds
        ?.filter((_, index: number) => this.showRow(index))
        ?.map((index: number) => this.itemsMap?.get(index));

      tableStyle.height = items?.reduce(
        (prev: number, curr: GanttItemExecution) =>
          (ganttFn.isLowLevel(curr) ? rowSize * config.HEIGHT_MULTIPLIER : rowSize) + prev, 0
        ) + 'px';
      tableStyle.gridTemplateRows = items?.map(
        (item: GanttItemExecution) => ganttFn.isLowLevel(item) ? config.LARGE_FR : config.ONE_FR
      ).join(' ');
      tableStyle.gridTemplateColumns = this.colsTemplate;

      const styleDeclHeader = (this.header.nativeElement as HTMLElement).style;
      styleDeclHeader.minWidth = this.colsWidth + 'px';
      styleDeclHeader.gridTemplateColumns = this.colsTemplate;
    }
  }

  // TODO: fix dopo rimozione progetto
  getPadding = (index: number): string => `gantt-item--level-${this.getItemAtIndex(index)?.level - 1 || 0 }`;
  getWidth = (index: number): string => `activity-gantt-item--level-${this.getItemAtIndex(index)?.level - 1 || 0 }`;

  public onFocusWeight(index: number): void {
    this.hilightIds = this.getSiblings(index);
  }

  public onBlurWeight(): void {
    this.hilightIds.clear();
  }

  public hasHighlight(index: number): boolean {
    const item: GanttItemExecution = this.getItemAtIndex(index);
    return !!item && this.hilightIds.has(item.id);
  }

  public hasHighlightError(index: number): boolean {
    const item: GanttItemExecution = this.getItemAtIndex(index);
    const siblingsSet = this.getSiblings(index);
    const totalWeight =  [...siblingsSet].reduce((prev, curr) => prev + (this.itemsMap.get(curr) ? this.itemsMap.get(curr).weight : 0) , 0);
    return  !this.isReadonly(index) && item.level >= 2 && (totalWeight < 99.5 || totalWeight > 100.5);
  }

  private getSiblings(index: number): Set<number> {
    const item: GanttItemExecution = this.getItemAtIndex(index);
    return item ? new Set([...this.itemsMap.values()].filter(i => i.parent === item.parent).map(i => i.id)) : new Set();
  }

  isReadonly(index: number): boolean {
    const item: GanttItemExecution = this.getItemAtIndex(index);
    return this.locked || !(item && this.editableTypes?.has(TypeCodeEnum[item.typeCode]));
  }

  showDates(index: number): boolean {
    const item: GanttItemExecution = this.getItemAtIndex(index);
    return item ? item.level <= 2 : !!item;
  }

  showColumn = (columnName: GanttColumnsEnum): boolean => this.availableColumns ? this.columns.has(columnName) : false;

  showDescription = (index: number): boolean => config.DESCRIPTION_TYPE_CODES.has(this.getItemAtIndex(index)?.typeCode);

  getDescription = (index: number): string => this.getItemAtIndex(index)?.description;

  navigateToItem = (index: number): void => {
    const item = this.getItemAtIndex(index);
    if (item?.subjectDetail) {
      this.router.navigate([item.subjectDetail]);
    }
  }

  showRow = (index: number): boolean => this.showZeroWeightRows || this.getItemAtIndex(index).weight > 0;

  hasBaseline = (index: number): boolean => {
    const item = this.getItemAtIndex(index);
    return !!item &&
      ganttFn.isPhase(item) &&
      (item.baselineStartDate as moment.Moment)?.isValid() &&
      (item.baselineEndDate as moment.Moment)?.isValid();
  }

  isStarted = (index: number): boolean => {
    const item = this.getItemAtIndex(index);
    return !!item && ((item.actualStartDate as moment.Moment)?.isValid() || !!item.progress);
  }

  isActive = (index: number): boolean => !!this.getItemAtIndex(index)?.isActive;

  isPermission = (index: number): boolean => !this.isReadonly(index) && ganttFn.isBatchPublicPermission(this.getItemAtIndex(index));

  onAddPermission(index: number): void{
      this.dialog
      .open(AddPermissionComponent, { data: { existingPermissions: this.ganttExecutionService.getAllPermessiPubblici() }})
      .afterClosed().subscribe(result => {
        if (result?.add){
          const  url = URLS.creaPermessi(this.ganttExecutionService.getPermessiPrincipaliUrl());
          this.creaPermessi.emit({url: url, permissions: result.permissions});
        }
      });
    }

  isCommission(index: any){
    let item = this.getItemAtIndex(index);
    let ret = ganttFn.isCommission(item);
    return ret;
  }

  isReadOnlyValue(index: any){
    return this.isNominativa || this.isReadonly(index) || this.isCommission(index)
  }

  isReadOnlyInizioPianificato(index: any){
    let item = this.getItemAtIndex(index);
    return this.isReadOnlyValue(index) || item.actualStartDate != null;
  }

  isReadOnlyFinePianificata(index: any){
    let item = this.getItemAtIndex(index);
    return this.isReadOnlyValue(index) || item.actualEndDate != null || item.typeCode === TypeCodeEnum.ENTRY_INTO_SERVICE;
  }
}
