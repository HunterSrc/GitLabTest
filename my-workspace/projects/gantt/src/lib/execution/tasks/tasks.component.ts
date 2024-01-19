import {
    AfterContentChecked,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import * as moment from 'moment';
import { SuccessFetchGanttAction } from 'projects/epms-main/src/app/@actions/gantt.action';
import { dto2stateMapper } from 'projects/epms-main/src/app/@effects/gantt/gantt.mapper';
import { GanttService } from 'projects/epms-main/src/app/@services/gantt.service';
import { GanttState } from 'projects/epms-main/src/app/@state/gantt.state';
import { OverlaySpinnerService } from 'projects/epms-main/src/app/commesse/commesse-detail/layout/overlay-spinner.service';
import { Subscription, of } from 'rxjs';
import {
    distinctUntilChanged,
    map,
    switchMap,
    take,
    tap,
    withLatestFrom
} from 'rxjs/operators';
import {
    ConfirmDialogGeneralComponent,
    DialogData
} from 'projects/epms-main/src/app/components/confirm-dialog-general/confirm-dialog-general.component';
import { State as DetailState } from '../../../../../epms-main/src/app/@state/entity-detail/entity-detail.state';
import {
    GanttColumnsEnum,
    GanttColumnsType,
    HEADERS,
    IColumnHeader
} from '../../@model/enums.model';
import {
    GanttItemExecution,
    ItemsMap
} from '../../@model/gantt-item-execution.model';
import { DateType } from '../../@model/gantt-item-project.model';
import { isMoment } from '../../@model/gantt-item.mapper';
import { TypeCodeEnum } from '../../@model/type-code.enum';
import * as ganttFn from '../../@services/gantt-execution-task.functions';
import { GanttExecutionService } from '../../@services/gantt-execution.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import * as config from '../gantt.config';
import { StandardActivityResetConfirmDialogComponent } from './components/standard-activity-reset.component';
import { State as PrincipalState } from '../../../../../epms-main/src/app/@state/principal.state';

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
    styleUrls: ['./tasks.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class TasksComponent
    implements OnInit, AfterContentChecked, OnDestroy, OnChanges
{
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
            : (config.DEFAULT_COLUMNS as GanttColumnsType[]);
        this.columns = new Set(availableColumns);
        this.headers = HEADERS.filter((e, i: number) =>
            availableColumns ? availableColumns.includes(e.name) : true
        );
        this.colsTemplate = this.headers.map((h) => `${h.width}px`).join(' ');
        this.colsWidth = this.headers
            .map((h) => +h.width)
            .reduce((p, c) => p + c, 0);
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
    ganttRows: GanttItemExecution[];
    loading: boolean;

    changeOdlConstructionInProgress = false;
    totalRequests: number;

    entityDetail: DetailState;
    hasWeightError = false;

    private _current: number = null;

    modifiedIds: Set<number> = new Set();
    hilightIds: Set<number> = new Set();

    itemsSubscription: Subscription;

    @ViewChild('itemsTable') itemsTable: ElementRef;
    @ViewChild('header') header: ElementRef;
    @Input() locked: boolean;
    @Input() set currentId(input: number[]) {
        if (input.length && this._current === null) {
            this._current = input[0];
        }
    }
    @Input() editableTypes: Set<TypeCodeEnum>;
    @Input() isNominativa = !!true;

    @Input() showZeroWeightRows = true;
    @Output() saveGantt = new EventEmitter();

    role = '';

    constructor(
        private ganttExecutionService: GanttExecutionService,
        private formBuilder: FormBuilder,
        private router: Router,
        private ref: ChangeDetectorRef,
        public matDialog: MatDialog,
        private restService: GanttService,
        protected detailStore: Store<{
            entityDetail: DetailState;
            gantt: GanttState;
        }>,
        protected overlaySpinnerSvc: OverlaySpinnerService,
        private principalStore: Store<{ principal: PrincipalState }>
    ) {
        this.mainForm = this.formBuilder.group({});
        this.itemsForms = this.formBuilder.array([]);
        this.mainForm.addControl('itemsForms', this.itemsForms);
    }

    ngOnInit(): void {
        this.itemsSubscription = this.ganttExecutionService
            .getItems()
            .subscribe((items) => (this.items = items));
        this.ganttRows = this.ganttExecutionService.getItemsBuffer();
        this.principalStore
            .pipe(take(1))
            .subscribe(
                (res) => (this.role = res.principal.principal.activeRoleCode)
            );
    }

    ngOnChanges(changes: SimpleChanges) {
        if (!this.changeOdlConstructionInProgress) {
            this.ganttRows = this.ganttExecutionService.getItemsBuffer();
        }
        this.hasWeightError =
            this.ganttRows.filter((el) => this.elementHasWeightError(el))
                .length > 0;
    }

    ngAfterContentChecked(): void {
        this.tableSetup();
    }

    ngOnDestroy(): void {
        this.itemsSubscription?.unsubscribe();
    }

    set items(itemsList: GanttItemExecution[]) {
        this.itemsMap = ganttFn.toMap(itemsList);
        this.itemsIds = itemsList.map((item) => item.id);
        if (!this.commissionCode) {
            this.commissionCode = itemsList.find(ganttFn.isCommission)?.name;
        }
        this.initForms();
    }

    get items(): GanttItemExecution[] {
        return this.itemsIds.map((id) => this.itemsMap.get(id));
    }

    private getTaskForm(item: GanttItemExecution): FormGroup {
        const dateToString = (value: DateType): string | null =>
            isMoment(value) && !!value?.isValid()
                ? value.format('DD/MM/YYYY')
                : null;
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
                weight: item.weight
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
        this.showHeader = !!this.itemsIds?.length;
        this.mainForm.addControl('itemsForms', this.itemsForms);
        this.itemsIds.forEach((id) => {
            this.itemsForms.push(this.getTaskForm(this.itemsMap.get(id)));
        });
        this.tableSetup();
        this.itemsForms.valueChanges
            .pipe(
                distinctUntilChanged(equalsValues),
                tap(this.updateMap.bind(this))
            )
            .subscribe();
    }

    elementHasWeightError(ganttElement: GanttItemExecution) {
        // se l'utente e' DL lv 3 altrimenti lv 2
        if (ganttElement.level < (this.role === 'DIREZIONE_LAVORI' ? 3 : 2)) {
            return false;
        }
        const acc = 0;
        const sibilings = this.ganttRows.filter(
            (el) => el.parent === ganttElement.parent
        );
        const totalWeight = sibilings.reduce((a, b) => a + b.weight, acc);
        return totalWeight > 100.5 || totalWeight < 99.5;
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
            // TODO Riabilitare quando il be sarà allineato
            // if (control.dirty) {
            this.modifiedIds.add(id);
            // }
            item.baselineStartDate = stringToDate(value.baselineStartDate);
            item.baselineEndDate = stringToDate(value.baselineEndDate);
            item.actualStartDate = stringToDate(value.actualStartDate);
            item.actualEndDate = stringToDate(value.actualEndDate);
            item.forecastStartDate = stringToDate(value.forecastStartDate);
            item.forecastEndDate = stringToDate(value.forecastEndDate);
            item.progress = this.checkProgressValue(value);
            item.weight = ganttFn.fixOutOfBoundValue(+value.weight);
            this.itemsMap.set(id, item);
        });
        this.ganttExecutionService.updateMapItems(this.itemsMap);
    }

    checkProgressValue(value: any) {
        // Check for progress: has to be between 0 and 100, integer.
        // also has to be 100 only if has actualEndDate
        let progress = ganttFn.fixOutOfBoundValue(+value.progress);
        if (isNaN(progress) || !value.actualStartDate) {
            progress = 0;
        }
        if (progress === 100 && !value.actualEndDate) {
            progress = 99;
        }
        return progress;
    }

    getItemAtIndex = (index: number): GanttItemExecution =>
        this.itemsMap.get(this.itemsIds[index]);

    isCollapsable(index: number) {
        if (
            this.getItemAtIndex(index).typeCode === 'CONTRACT' &&
            this.getItemAtIndex(index).weight === 0
        ) {
            return (
                this.getItemAtIndex(index)?.collapsable &&
                this.showStandardActivity(index)
            );
        }
        return this.getItemAtIndex(index)?.collapsable;
    }

    isCollapsed = (index: number): boolean =>
        this.getItemAtIndex(index)?.collapsed;

    isCurrent = (index: number): boolean =>
        this.itemsIds[index] === this._current;

    onCollapseToggle(index: number): void {
        this.ganttExecutionService.toggleCollapse(this.itemsIds[index]);
    }

    isCompleted(index: number) {
        const item = this.getItemAtIndex(index);
        return !!item && item.progress === 100;
    }

    isProgressReadOnly(index: number) {
        // Progress is editable only if is contract and actualEndDate is not filled
        const item = this.getItemAtIndex(index);
        const isEditable =
            !this.isReadonly(index) &&
            !!item &&
            item.typeCode === TypeCodeEnum.STANDARD_ACTIVITY_CONTRACT &&
            !item.actualEndDate;
        return !isEditable;
    }

    onCloseBatch(index: number): void {
        this.ganttExecutionService.closeBatch(this.itemsIds[index]);
    }

    showActivation = (index: number): boolean =>
        !this.isReadonly(index) &&
        this.hasBaseline(index) &&
        !this.isStarted(index);

    showForecastDates(index: number): boolean {
        const item = this.itemsMap.get(this.itemsIds[index]);
        return (
            ganttFn.isProject(item) ||
            ganttFn.isCommission(item) ||
            (ganttFn.isPhase(item) && !!item?.isActive)
        );
    }

    showCloseBatchAction = (index: number): boolean =>
        !this.isReadonly(index) &&
        ganttFn.isBatchClosable(this.getItemAtIndex(index));

    onActivationToggle(index: number): void {
        const item = this.getItemAtIndex(index);
        this.ganttExecutionService.toggleActivation(this.itemsIds[index]);
        if (!!item && item?.level === 2) {
            this.matDialog
                .open(ConfirmDialogComponent, {
                    data: {
                        phaseName: item.name,
                        activate: !item.isActive,
                        commissionCode: this.commissionCode
                    }
                })
                .afterClosed()
                .subscribe((result) => {
                    if (result) {
                        this.saveGantt.emit('save');
                    } else {
                        this.ganttExecutionService.restoreActivationBackup(
                            item.id
                        );
                    }
                });
        }
    }

    tableSetup(): void {
        const rowSize = this.isNominativa
            ? config.ROWSIZE
            : config.ROWSIZE_SMALL;
        if (this.itemsTable && this.header) {
            const tableStyle: CSSStyleDeclaration = (
                this.itemsTable.nativeElement as HTMLElement
            ).style;
            tableStyle.minWidth = `${this.colsWidth}px`;

            const items = this.itemsIds
                ?.filter((_, index: number) => this.showRow(index))
                ?.map((index: number) => this.itemsMap?.get(index));

            tableStyle.height = `${items?.reduce(
                (prev: number, curr: GanttItemExecution) =>
                    (ganttFn.isLowLevel(curr)
                        ? rowSize * config.HEIGHT_MULTIPLIER
                        : rowSize) + prev,
                0
            )}px`;
            tableStyle.gridTemplateRows = items
                ?.map((item: GanttItemExecution) =>
                    ganttFn.isLowLevel(item) ? config.LARGE_FR : config.ONE_FR
                )
                .join(' ');
            tableStyle.gridTemplateColumns = this.colsTemplate;

            const styleDeclHeader = (this.header.nativeElement as HTMLElement)
                .style;
            styleDeclHeader.minWidth = `${this.colsWidth}px`;
            styleDeclHeader.gridTemplateColumns = this.colsTemplate;
        }
    }

    // TODO: fix dopo rimozione progetto
    getPadding = (index: number): string =>
        `gantt-item--level-${this.getItemAtIndex(index)?.level - 1 || 0}`;
    getWidth = (index: number): string =>
        `activity-gantt-item--level-${this.getItemAtIndex(index)?.level - 1 || 0}`;

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
        const totalWeight = [...siblingsSet].reduce(
            (prev, curr) =>
                prev +
                (this.itemsMap.get(curr) ? this.itemsMap.get(curr).weight : 0),
            0
        );
        if (item?.typeCode === 'CONTRACT') {
            const itemSibilings = this.ganttRows.filter(
                (el) => el.parent === item.parent
            );
            const activeSibilings = itemSibilings.filter((el) => el.isActive);
            if (activeSibilings.length === 0) {
                return false;
            }
        }
        const weightError =
            !this.isReadonly(index) &&
            item.level >= 2 &&
            (totalWeight < 99.5 || totalWeight > 100.5);
        return weightError;
    }

    wrongPercentageMessage(index: number) {
        if (this.hasHighlightError(index)) {
            let errorWeight: number;
            let message: string;
            const siblingsSet = this.getSiblings(index);
            const totalWeight = [...siblingsSet].reduce(
                (prev, curr) =>
                    prev +
                    (this.itemsMap.get(curr)
                        ? this.itemsMap.get(curr).weight
                        : 0),
                0
            );
            if (totalWeight > 100) {
                errorWeight = totalWeight - 100;
                message = 'Valore in eccesso pari al ';
            }
            if (totalWeight < 100) {
                errorWeight = 100 - totalWeight;
                message = 'Valore residuo pari al ';
            }
            return `${message + errorWeight.toString()}%`;
        }
    }

    private getSiblings(index: number): Set<number> {
        const item: GanttItemExecution = this.getItemAtIndex(index);
        return item
            ? new Set(
                  [...this.itemsMap.values()]
                      .filter((i) => i.parent === item.parent)
                      .map((i) => i.id)
              )
            : new Set();
    }

    isReadonly(index: number): boolean {
        const item: GanttItemExecution = this.getItemAtIndex(index);
        return (
            this.locked ||
            !(item && this.editableTypes?.has(TypeCodeEnum[item.typeCode]))
        );
    }

    showDates(index: number): boolean {
        const item: GanttItemExecution = this.getItemAtIndex(index);
        return item ? item.level <= 2 : !!item;
    }

    showColumn = (columnName: GanttColumnsEnum): boolean =>
        this.availableColumns ? this.columns.has(columnName) : false;

    showDescription = (index: number): boolean =>
        config.DESCRIPTION_TYPE_CODES.has(this.getItemAtIndex(index)?.typeCode);

    getDescription = (index: number): string =>
        this.getItemAtIndex(index)?.description;

    navigateToItem = (index: number): void => {
        const item = this.getItemAtIndex(index);
        if (item?.subjectDetail) {
            this.router.navigate([item.subjectDetail]);
        }
    };

    showRow(index: number) {
        return (
            !this.showZeroWeightRows || this.getItemAtIndex(index).weight > 0
        );
    }

    hasBaseline = (index: number): boolean => {
        const item = this.getItemAtIndex(index);
        return (
            !!item &&
            ganttFn.isPhase(item) &&
            (item.baselineStartDate as moment.Moment)?.isValid() &&
            (item.baselineEndDate as moment.Moment)?.isValid()
        );
    };

    isStarted = (index: number): boolean => {
        const item = this.getItemAtIndex(index);
        return (
            !!item &&
            ((item.actualStartDate as moment.Moment)?.isValid() ||
                !!item.progress)
        );
    };

    isActive = (index: number): boolean =>
        !!this.getItemAtIndex(index)?.isActive;

    getIdByIndex(index: number) {
        const item = this.getItemAtIndex(index);
        return item.id;
    }

    showToggleOdlCons(index: number) {
        const item = this.getItemAtIndex(index);
        const isTypeCodeOdlCons = item.typeCode === 'CONTRACT';
        const itemHasChildren = item.childrenIdList.length > 0;
        return (
            isTypeCodeOdlCons &&
            itemHasChildren &&
            (item.weight === 0 || '') &&
            !this.isReadonly(index)
        );
    }

    isToggleDisabled(index: number) {
        const actualElement = this.getItemAtIndex(index);
        const initialValue = 0;
        const odlList = this.ganttRows.filter(
            (el) => el.parent === actualElement.parent
        );
        const odlListActive = odlList.filter((el) => el.isActive === true);
        if (odlListActive.length > 1) {
            const sum = odlListActive.reduce(
                (a, b) => a + b.weight,
                initialValue
            );
            return sum !== 100;
        }
        return false;
    }

    isEditable = (item: GanttItemExecution): boolean =>
        this.editableTypes?.has(TypeCodeEnum[item.typeCode]);

    showActivityToggle(index: number) {
        const item = this.getItemAtIndex(index);
        if (item.isActive) {
            this.openConfirmDeactivateOdl(index);
        } else {
            this.changeOdlConstructionInProgress = true;
            this.overlaySpinnerSvc.loading();
            const commissionId = this.ganttRows.find((el) => el.level === 1).id;
            const projectId = this.ganttRows.find((el) => el.level === 0).id;
            this.detailStore
                .select('gantt')
                .pipe(
                    take(1),
                    switchMap((gantt) => {
                        const weightLeft = this.sumWeightsActive(item);
                        item.isActive = !item.isActive;
                        item.weight = weightLeft;
                        const ganttToSave = {
                            modifiedRows: this.ganttRows.filter(
                                this.isEditable
                            ),
                            processState: gantt.processState,
                            projectConstraints: gantt.projectConstraints
                        };

                        const resetBody = {
                            isActive: item.isActive,
                            commissionId,
                            projectId,
                            weight: weightLeft,
                            ganttToSave
                        };
                        return this.ganttExecutionService.resetDataOdlConstruction(
                            item.id,
                            resetBody
                        );
                    })
                )
                .subscribe((response: any) => {
                    this.initForms();
                    this.overlaySpinnerSvc.notLoading();
                    this.changeOdlConstructionInProgress = false;
                });
        }
    }

    showStandardActivity(index: number) {
        /* quando ci sarà il booleano (es showStandardActivity) dentro l'item del gantt cambiarne il valore */
        const item = this.getItemAtIndex(index);
        return item.isActive;
    }

    openConfirmDeactivateOdl(index: number) {
        if (this.showStandardActivity(index)) {
            const odlItem = this.getItemAtIndex(index);
            this.changeOdlConstructionInProgress = true;
            const commissionId = this.ganttRows.find((el) => el.level === 1).id;
            const projectId = this.ganttRows.find((el) => el.level === 0).id;
            this.matDialog
                .open(StandardActivityResetConfirmDialogComponent, {})
                .afterClosed()
                .pipe(
                    withLatestFrom(this.detailStore.select('gantt')),
                    map(([data, gantt]) => {
                        if (!data) {
                            this.ganttExecutionService.restoreActivationBackup(
                                odlItem.id
                            );
                            return null;
                        }
                        odlItem.isActive = !odlItem.isActive;
                        const weightLeft = 0;
                        const odlItemIsActive = odlItem.isActive;
                        const ganttToSave = {
                            modifiedRows: this.ganttRows.filter(
                                this.isEditable
                            ),
                            processState: gantt.processState,
                            projectConstraints: gantt.projectConstraints
                        };
                        this.overlaySpinnerSvc.loading();

                        return {
                            isActive: odlItemIsActive,
                            commissionId,
                            projectId,
                            weight: weightLeft,
                            ganttToSave
                        };
                    }),

                    withLatestFrom(this.detailStore.select('gantt')),
                    switchMap(([body, gantt]) => {
                        if (!body) {
                            return of(null);
                        }
                        return this.ganttExecutionService.resetDataOdlConstruction(
                            odlItem.id,
                            body
                        );
                    })
                )
                .subscribe((response) => {
                    if (response) {
                        // check se il nodo current è un figlio del nodo che ho disabilitato
                        let currentWireframe = false;
                        for (const child of odlItem.childrenIdList) {
                            if (child === this._current) {
                                currentWireframe = true;
                                break;
                            }
                        }
                        // se si, fare redirect al dettaglio del padre
                        if (currentWireframe && odlItem?.subjectDetail) {
                            this.router
                                .navigate([odlItem.subjectDetail])
                                .finally(() => {
                                    this.overlaySpinnerSvc.notLoading();
                                });
                        } else {
                            this.detailStore.dispatch(
                                SuccessFetchGanttAction(
                                    dto2stateMapper(response)
                                )
                            );
                            this.ganttExecutionService.init2(
                                dto2stateMapper(response)
                            );
                            this.overlaySpinnerSvc.notLoading();
                        }
                        this.changeOdlConstructionInProgress = false;
                    }
                });
        }
    }

    sumWeightsActive(odlItem: GanttItemExecution) {
        const acc = 0;
        const odlList = this.ganttRows.filter(
            (el) => el.parent === odlItem.parent
        );
        const odlListActive = odlList.filter((element) => element.isActive);
        const sum = odlListActive.reduce((a, b) => a + b.weight, acc);
        return 100 - sum;
    }
    isWeightEditable(index: number) {
        return (
            !this.hasWeightError ||
            (this.hasWeightError && this.hasHighlightError(index))
        );
    }
    ResetWeight(index: number) {
        const ganttRows = this.ganttExecutionService.getItemsBuffer();
        const childrenIdList = this.getItemAtIndex(index).childrenIdList;
        const data: DialogData = {
            message:
                'Confermi di voler azzerare i pesi delle attività standard relative a questo nodo?',
            confirm: 'Conferma',
            close: 'Annulla'
        };
        this.matDialog
            .open(ConfirmDialogGeneralComponent, { data })
            .afterClosed()
            .pipe(take(1))
            .subscribe((result) => {
                if (result) {
                    const childrenList = ganttRows.filter(
                        (el) => childrenIdList.indexOf(el.id) > -1
                    );
                    for (const child of childrenList) {
                        child.weight = 0;
                    }
                    this.initForms();
                }
            });
    }

    hasResetButton(index: number) {
        const item = this.getItemAtIndex(index);
        return (
            item.typeCode === 'CONTRACT' &&
            !this.isReadonly(index) &&
            item.childrenIdList.length > 0
        );
    }
}
