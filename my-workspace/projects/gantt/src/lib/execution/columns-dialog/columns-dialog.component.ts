import { Component, Inject, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { GanttColumnsEnum } from '../../@model/enums.model';

interface IColumn {
    name: string;
    checked: boolean;
}

@Component({
    selector: 'lib-columns-dialog',
    templateUrl: './columns-dialog.component.html',
    styleUrls: ['./columns-dialog.component.scss']
})
export class ColumnsDialogComponent implements OnDestroy {
    columns: IColumn[] = Object.values(GanttColumnsEnum).map((val: string) => ({
        name: val,
        checked: false
    }));

    get checkedAll(): boolean {
        return this.columns.every((e) => e.checked);
    }

    get uncheckedAll(): boolean {
        return this.columns.every((e) => !e.checked);
    }

    get filteredColumns(): string[] {
        return this.columns.filter((e) => e.checked).map((e) => e.name);
    }

    private confirmed = false;
    private dialogReturnSub: Subscription;

    constructor(
        private dialogRef: MatDialogRef<ColumnsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private data: Set<string>
    ) {
        if (data) {
            this.columns = this.columns.map((e: IColumn, i: number) => ({
                ...e,
                checked: data.has(e.name)
            }));
        }
        this.dialogReturnSub = dialogRef
            .beforeClosed()
            .subscribe(
                () =>
                    this.confirmed && this.dialogRef.close(this.filteredColumns)
            );
    }

    ngOnDestroy(): void {
        this.dialogReturnSub?.unsubscribe();
    }

    close = (): void => {
        this.dialogRef.close();
    };

    confirm = (): void => {
        this.confirmed = true;
        this.close();
    };

    checkColumn = ($event, index: number): void => {
        $event.preventDefault();
        this.columns[index] = {
            name: this.columns[index].name,
            checked: !this.columns[index].checked
        };
    };

    onSelectAllCheck = ($event): void => {
        $event.preventDefault();
        const selectedAll = this.checkedAll;
        this.columns = this.columns.map((e: IColumn) => ({
            name: e.name,
            checked: !selectedAll
        }));
    };
}
