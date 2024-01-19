export enum ConstraintType {
    end_start,
    end_end,
    start_end,
    start_start
}

export enum GanttColumnsEnum {
    ATTIVA = 'Attiva',
    INIZIO_PIANIFICATO = 'Inizio Pianificato',
    FINE_PIANIFICATA = 'Fine Pianificata',
    INIZIO_EFFETTIVO = 'Inizio Effettivo',
    FINE_EFFETTIVA = 'Fine Effettiva',
    INIZIO_FORECAST = 'Inizio Forecast',
    FINE_FORECAST = 'Fine Forecast',
    PESO = 'Peso'
}

export type GanttColumnsType = GanttColumnsEnum | 'Attività' | 'Progress';

export interface IColumnHeader {
    name: GanttColumnsType;
    width: number;
}

export const HEADERS: IColumnHeader[] = [
    { name: 'Attività', width: 500 },
    { name: 'Progress', width: 50 },
    { name: GanttColumnsEnum.ATTIVA , width: 50 },
    { name: GanttColumnsEnum.INIZIO_PIANIFICATO , width: 100 },
    { name: GanttColumnsEnum.FINE_PIANIFICATA , width: 100 },
    { name: GanttColumnsEnum.INIZIO_EFFETTIVO , width: 100 },
    { name: GanttColumnsEnum.FINE_EFFETTIVA , width: 100 },
    { name: GanttColumnsEnum.INIZIO_FORECAST , width: 100 },
    { name: GanttColumnsEnum.FINE_FORECAST , width: 100 },
    { name: GanttColumnsEnum.PESO, width: 50 }
];
