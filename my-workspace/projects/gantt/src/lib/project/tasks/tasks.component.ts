import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewChild
} from '@angular/core';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ValidationErrors
} from '@angular/forms';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import {
    DateType,
    Editable,
    GanttItem,
    ItemsMap
} from '../../@model/gantt-item-project.model';
import { TypeCodeEnum } from '../../@model/type-code.enum';
import * as ganttFn from '../../@services/gantt-project-task.function';
import {
    GanttProjectService,
    sortItems
} from '../../@services/gantt-project.service';
import * as config from '../gantt.config';
import { GanttColumnsEnum } from '../../@model/enums.model';
import { ConfirmDialogComponent } from '../../execution/confirm-dialog/confirm-dialog.component';

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
    if (date?.isValid()) {
        if (date.isBefore(moment(), 'day')) {
            return { past: true };
        }
    } else {
        return { invalid: true };
    }
};

const rangeValidator = (start, end: moment.Moment): ValidationErrors =>
    end.isBefore(start) ? { invalidInterval: true } : {};

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
        err = { ...err, ...rangeValidator(mtStart, mtEnd) };
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
        { name: 'Scostamento vs. MAP', width: 100 }
    ];

    colsTemplate = this.headers.map((h) => `${h.width}px`).join(' ');
    colsWidth = this.headers.map((h) => +h.width).reduce((p, c) => p + c, 0);

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
    @Input() isUnderReauth: boolean;
    @Output() saveGantt = new EventEmitter<string>();
    public isUnderReautorization = false;

    constructor(
        private ganttProjectService: GanttProjectService,
        private snackBar: MatSnackBar,
        private formBuilder: FormBuilder,
        private dialog: MatDialog
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

    set items(itemsList: GanttItem[]) {
        const orderedList = itemsList.sort(sortItems);
        this.itemsMap = ganttFn.toMap(orderedList);
        this.itemsIds = orderedList.map((item) => item.id);
        this.initForms();
    }

    get items(): GanttItem[] {
        return this.itemsIds.map((id) => this.itemsMap.get(id));
    }

    private getTaskForm(item: GanttItem): FormGroup {
        const dateToString = (value: moment.Moment): string | null =>
            value?.isValid() ? value.format('DD/MM/YYYY') : null;
        const group = this.formBuilder.group(
            {
                id: item.id,
                mapStartDate: dateToString(item.mapStartDate as moment.Moment),
                mapEndDate: dateToString(item.mapEndDate as moment.Moment),
                plannedStartDate: [
                    dateToString(item.plannedStartDate?.value as moment.Moment),
                    dateControlValidator
                ],
                plannedEndDate: [
                    dateToString(item.plannedEndDate?.value as moment.Moment),
                    dateControlValidator
                ],
                progress: item.progress,
                delay: item.delay
            },
            { updateOn: 'blur', validators: formValidator }
        );

        let editable;
        this.isUnderReautorization =
            this.ganttProjectService.isProjectUnderReautorization();
        if (this.isUnderReautorization === true) {
            // la data di inizio pianificata viene resa editabile SOLO SE
            // mapStartDate di quell'item è diversa dalla mapStartDate del progetto.
            editable = [
                +(
                    !item.hasActualStartDate &&
                    !this.ganttProjectService.hasConstraint(item) &&
                    this.isDifferentFromProjectStart(
                        item.mapStartDate,
                        item.typeCode
                    ) &&
                    item.level > 0
                ),
                +item.plannedEndDate?.editable
            ];
        } else {
            editable = [
                +(
                    item.plannedStartDate?.editable &&
                    !this.ganttProjectService.hasConstraint(item)
                ),
                +item.plannedEndDate?.editable
            ];
        }

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
                errorStr =
                    "E' stata inserita una data di inzio precedente alla data odierna";
            }
            if (control.hasError('pastEnd')) {
                errorStr =
                    "E' stata inserita una data di fine precedente alla data odierna";
            }
            if (control.hasError('invalidDates')) {
                errorStr = "E' stata inserita una data non valida";
            }
            if (control.hasError('invalidInterval')) {
                errorStr = "E' stato inserito un intervallo di date non valido";
            }
            this.snackBar.open(errorStr, 'Chiudi');
            this.resetErrors(control);
        }
    }

    updateMap<T extends FormValue>(_value: any): void {
        const stringToDate = (value: string): moment.Moment =>
            moment(value, 'DD/MM/YYYY').isValid()
                ? moment(value, 'DD/MM/YYYY')
                : null;
        this.snackBar.dismiss();
        this.itemsForms.controls.forEach((control) => {
            const value: T = control.value;
            const id = Number(value.id);
            const item = { ...this.itemsMap.get(id) };
            item.plannedStartDate.value = stringToDate(value.plannedStartDate);
            item.plannedEndDate.value = stringToDate(value.plannedEndDate);
            if (control.valid) {
                item.mapStartDate = stringToDate(value.mapStartDate);
                item.mapEndDate = stringToDate(value.mapEndDate);
                item.progress = +value.progress;
                item.delay = +value.delay;
                this.itemsMap.set(id, item);
            } else if (item.isActive) {
                this.checkControl(control);
            }
        });

        this.ganttProjectService.updateMapItems(this.itemsMap);
    }

    getItemAtIndex = (index: number): GanttItem =>
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

            const styleDeclHeader = (this.header.nativeElement as HTMLElement)
                .style;
            styleDeclHeader.minWidth = `${this.colsWidth}px`;
            styleDeclHeader.gridTemplateColumns = this.colsTemplate;
        }
    }

    getPadding = (index: number): string =>
        `gantt-item--level-${this.getItemAtIndex(index)?.level}`;

    isReadonly(index: number): boolean {
        const item: GanttItem = this.getItemAtIndex(index);
        return !(
            item.isActive &&
            item &&
            this.editableTypes?.has(TypeCodeEnum[item.typeCode])
        );
    }

    getRectDimensions = (): { width: number; height: number } => ({
        width: this.headers.reduce((p, c) => p + c.width, 0),
        height: (this.itemsIds.length + 1) * config.ROWSIZE
    });

    private isEditableDatePlanned = (index: number, isEnd = false): boolean => {
        const item = this.getItemAtIndex(index);
        if (item?.isActive) {
            if (item.level === 0) {
                return false;
            }
            return this.editablePlannedDates.get(item.id)
                ? !!this.editablePlannedDates.get(item.id)[+isEnd]
                : false;
        }
        return false;
    };

    isEditableStartDatePlanned = (index: number): boolean =>
        this.isEditableDatePlanned(index);
    isEditableEndDatePlanned = (index: number): boolean =>
        this.isEditableDatePlanned(index, true);

    getItemName(index: number): string {
        const name = this.getItemAtIndex(index).name;
        return name.length < 45 ? name : `${name.substring(0, 40)}...`;
    }

    saveDisbaled(): boolean {
        return !!this.validateMap().length;
    }

    private validateMap(): any[] {
        const checkDate = (
            date: Editable<DateType>,
            id: number,
            start = true
        ) =>
            this.isUnderReauth
                ? this.editablePlannedDates.get(id)[start ? 0 : 1] === 1 &&
                  dateValidator(date?.value as moment.Moment)
                : !!date?.editable &&
                  dateValidator(date?.value as moment.Moment);
        return [...(this.itemsMap.values() || [])]
            .map(
                (value) =>
                    value.isActive &&
                    (checkDate(value?.plannedStartDate, value?.id) ||
                        checkDate(value?.plannedEndDate, value?.id, false))
            )
            .filter((v) => !!v);
    }

    hasError(index: number): boolean {
        const item: GanttItem = this.getItemAtIndex(index);
        if (
            !!item?.isActive &&
            this.editablePlannedDates.get(item.id)[0] === 1 &&
            this.editablePlannedDates.get(item.id)[1] === 1
        ) {
            const start = item?.plannedStartDate?.value as moment.Moment;
            const end = item?.plannedEndDate?.value as moment.Moment;
            let error = { ...dateValidator(start), ...dateValidator(end) };
            if (start?.isValid() && end?.isValid()) {
                error = { ...error, ...rangeValidator(start, end) };
            }
            return !!Object.keys(error).length;
        }
        return false;
    }

    hasErrorEnd(index: number): boolean {
        const item: GanttItem = this.getItemAtIndex(index);
        if (!!item?.isActive && item?.plannedEndDate?.editable) {
            // caso in cui start non editabile ma end si
            const start = item?.plannedStartDate?.value as moment.Moment;
            const end = item?.plannedEndDate?.value as moment.Moment;
            let error = { ...dateValidator(end) };
            if (end?.isValid()) {
                error = { ...error, ...rangeValidator(start, end) };
            }
            return !!Object.keys(error).length;
        }
        return false;
    }

    isCompleted(index: number) {
        const item = this.getItemAtIndex(index);
        return !!item && item.progress === 100;
    }

    isDifferentFromProjectStart(date: DateType, typeCode: string): boolean {
        const constraintVersion =
            this.ganttProjectService.getConstraintVersion();
        if (constraintVersion === 0 && typeCode !== TypeCodeEnum.ENGINEERING) {
            // CR141 che impatta solo nuovi legami, per i vecchi influisce solo per la fase ingegneria
            return true;
        }
        const project = this.ganttProjectService.getProject();
        const projectStartDate = moment(project?.mapStartDate);
        return projectStartDate?.diff(date, 'days') !== 0;
    }

    onActivationToggle(index: number) {
        const item = this.getItemAtIndex(index);
        if (item.isActive) {
            // la fase era attiva -> devo DISATTIVARE
            // prendere constraint slave di questa fase con constraint non più valido e cambiare le date pianificate,
            // ricorsivamente applicare questa logica in caso uno slave avesse a sua volta degli slaves.
            const slaves = this.ganttProjectService.getSlaves(item);
            this.updateSlaveItems(slaves);
        } else {
            // la fase era disattivata -> devo ATTIVARE
            // se la data di inizio risulta editabile e ci sono le date map, allora calcolo le date pianificate come segue:
            // inizio: oggi/mapStart se nel futuro, fine: inizio + differenza tra fine e inizio map.
            if (
                this.editablePlannedDates.get(item.id)[0] &&
                this.editablePlannedDates.get(item.id)[1] &&
                item.mapStartDate &&
                item.mapEndDate
            ) {
                item.plannedStartDate.value = this.calculateStartDate(item);
                item.plannedEndDate.value = this.calculateEndDate(item);
            }

            if (
                !this.isDifferentFromProjectStart(
                    item.mapStartDate,
                    item.typeCode
                ) &&
                this.ganttProjectService.getConstraintVersion() !== 0
            ) {
                item.plannedStartDate.value = item.mapStartDate;
            }
        }
        item.isActive = !item.isActive;
        this.itemsMap.set(item.id, item);
        this.ganttProjectService.updateMapItems(this.itemsMap);
    }

    calculateStartDate(item: GanttItem) {
        if (!item.mapStartDate && !item.mapEndDate) {
            return null;
        }
        if (moment(item.mapStartDate).diff(moment()) > 0) {
            return moment(item.mapStartDate);
        }
        return moment();
    }

    calculateEndDate(item: GanttItem) {
        const diff = moment(item.mapEndDate).diff(
            moment(item.mapStartDate),
            'days'
        );
        if (isNaN(diff) || diff < 0) {
            return null;
        }
        return moment(item.plannedStartDate.value).add(diff, 'days');
    }

    hidePhaseToggle = (index: number): boolean => {
        const item = this.getItemAtIndex(index);
        return (
            !this.editableTypes?.has(TypeCodeEnum[item.typeCode]) ||
            item.progress > 0 ||
            item.hasActualStartDate ||
            item.level === 0
        );
    };

    showPlannedDate(index: number): boolean {
        const item = this.getItemAtIndex(index);
        return item?.isActive;
    }

    updateSlaveItems(slaves: Set<string>) {
        if (!slaves || slaves.size === 0) {
            return;
        }

        for (const slave of slaves) {
            const allItems = [...(this.itemsMap.values() || [])];
            const slaveElement = allItems.find((el) => el.typeCode === slave);
            if (slaveElement) {
                const slaveItem = this.itemsMap.get(slaveElement.id);
                if (
                    slaveItem &&
                    this.isDifferentFromProjectStart(
                        slaveItem.mapStartDate,
                        slaveItem.typeCode
                    )
                ) {
                    slaveItem.plannedStartDate.value =
                        this.calculateStartDate(slaveItem);
                    slaveItem.plannedEndDate.value =
                        this.calculateEndDate(slaveItem);
                    this.itemsMap.set(slaveItem.id, slaveItem);
                    const newSlaves =
                        this.ganttProjectService.getSlaves(slaveItem);
                    this.updateSlaveItems(newSlaves);
                }
            }
        }
    }
}
