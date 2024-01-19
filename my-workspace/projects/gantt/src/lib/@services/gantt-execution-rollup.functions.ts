import * as moment from 'moment';
import {
    ConstraintDescriptor,
    ConstraintType
} from '../@model/constraint.model';
import {
    GanttItemExecution,
    ItemsMap
} from '../@model/gantt-item-execution.model';
import { TypeCodeUnion } from '../@model/type-code.enum';
import { isPhase } from './gantt-execution-task.functions';

export type MtDate = moment.Moment;

export const getMinDate = (...dates: MtDate[]): MtDate =>
    dates.reduce((p: MtDate, c: MtDate) => (p?.isBefore(c) ? p : c), dates[0]);

export const getMaxDate = (...dates: MtDate[]): MtDate =>
    dates.reduce((p: MtDate, c: MtDate) => (p?.isAfter(c) ? p : c), dates[0]);

export const checkWeights = (children: GanttItemExecution[]): boolean => {
    const sum = children.reduce((a, c) => a + c.weight, 0);
    return sum >= 99.5 && sum <= 100.5;
};

/**
 * Aggiorna il progress di un elemento del gantt facendo la somma pesata del progress dei propri figli
 *
 * @param item l'elemento del gantt di cui si vuole aggiornare il progress
 * @param children i figli dell'elemento target
 */
export const updateProgress = (
    item: GanttItemExecution,
    children: GanttItemExecution[]
): void => {
    const getAddendum = (i: GanttItemExecution) =>
        (i.weight / 100) * i.progress;
    item.progress = Math.round(
        children.reduce((a, c) => a + getAddendum(c), 0)
    );
};

/**
 * Aggiorna le date actual di un elemento del gantt basandosi sulle date actual dei propri figli
 * Come data actual di inizio prende la minore tra le date actual di inizio dei propri figli.
 * Come data actual di fine prende la maggiore tra le date actual di fine dei propri figli sse sono tutte valorizzate
 *
 * @param item l'elemento del gantt di cui si vogliono aggiornare le date actual
 * @param children i figli dell'elemento target
 */
export const updateActualDates = (
    item: GanttItemExecution,
    children: GanttItemExecution[]
): void => {
    const startDates = children
        .map((child) => child.actualStartDate as moment.Moment)
        .filter((d) => d?.isValid());
    const endDates = children
        .map((child) => child.actualEndDate as moment.Moment)
        .filter((d) => d?.isValid());
    item.actualStartDate =
        (startDates.length && moment(getMinDate(...startDates))) || null;
    item.actualEndDate =
        (endDates.length === children.filter((c) => !!c.weight).length &&
            moment(getMaxDate(...endDates))) ||
        null;
};

const isSameDate = (d1: moment.Moment, d2: moment.Moment): boolean =>
    (d1.isValid() && d2.isValid() && d1.isSame(d2, 'day')) ||
    (!d1.isValid() && !d2.isValid());

/**
 * Aggiorna le date forecast di un elemento del gantt basandosi sullo stato delle sue date actual
 * Se le date actual sono entrambe valorizzate, vengono copiate nelle date forecast.
 * Se le date actual sono entrambe non valorizzate, vengono copiate le date di baseline nelle date forecast.
 * Se la data actual di fine non è ancora stata valorizzata, la data di inizio forecast diventa uguale alla data di inizio actual
 * mentre la data di fine forecast sarà pari a: data odierna + ( progress residuo * durata intervallo date di baseline)
 *
 * @param item l'elemento di cui si vogliono aggiornare le date forecast
 */
export const updateForecast = (
    item: GanttItemExecution,
    children: GanttItemExecution[]
): void => {
    if (item.actualStartDate && item.actualEndDate) {
        item.forecastStartDate = moment(item.actualStartDate);
        item.forecastEndDate = moment(item.actualEndDate);
    }
    if (item.actualStartDate && !item.actualEndDate) {
        const baselineLength =
            (item.baselineEndDate as moment.Moment)?.diff(
                item.baselineStartDate,
                'days'
            ) || 0;
        const progressRemains = (100 - item.progress) / 100;
        item.forecastStartDate = moment(item.actualStartDate);
        item.forecastEndDate =
            item.level >= 2
                ? moment().add(
                      Math.round(progressRemains * baselineLength),
                      'days'
                  )
                : getMaxEndDateForecast(children);
    }
    if (!item.actualStartDate && !item.actualEndDate) {
        if (item.typeCode === 'ENTRY_INTO_SERVICE') {
            item.forecastStartDate = item.forecastStartDate
                ? moment(item.forecastStartDate)
                : moment(item.baselineStartDate);
            item.forecastEndDate = item.forecastEndDate
                ? moment(item.forecastEndDate)
                : moment(item.baselineEndDate);
        } else if (item.level < 2) {
            item.forecastStartDate = getMinStartDateForecast(children);
            item.forecastEndDate = getMaxEndDateForecast(children);
        } else if (moment(item.baselineStartDate).isBefore(moment())) {
            const baselineLength =
                (item.baselineEndDate as moment.Moment)?.diff(
                    item.baselineStartDate,
                    'days'
                ) || 0;
            item.forecastStartDate = moment();
            const shiftedEndDate = moment().add(baselineLength, 'days');
            item.forecastEndDate =
                item.level >= 2
                    ? shiftedEndDate
                    : getMaxEndDateForecast(children);
        } else {
            item.forecastStartDate = moment(item.baselineStartDate);
            item.forecastEndDate = moment(item.baselineEndDate);
        }
    }
};

const getMaxEndDateForecast = (items: GanttItemExecution[] = []): MtDate => {
    const dates: MtDate[] = items
        .filter((item) => item.isActive)
        .filter((item) => !!item.weight)
        .map((item) => item.forecastEndDate as moment.Moment)
        .filter((item) => item?.isValid());
    return dates.length ? getMaxDate(...dates) : null;
};

const getMinStartDateForecast = (items: GanttItemExecution[] = []): MtDate => {
    const dates: MtDate[] = items
        .filter((item) => item.isActive)
        .filter((item) => !!item.weight)
        .map((item) => item.forecastStartDate as moment.Moment)
        .filter((item) => item?.isValid());
    return dates.length ? getMinDate(...dates) : null;
};

export const calculateItemRollup = (
    item: GanttItemExecution,
    children: GanttItemExecution[]
) => {
    const isHiLevelItem = item.level >= 0 && item.level <= 2;
    // Unused
    // const isPhaseWithNoChildren = item.level === 2 && (!children || children.length === 0);
    if (checkWeights(children)) {
        updateProgress(item, children);
        updateActualDates(item, children);
        if (isHiLevelItem) {
            updateForecast(item, children);
        }
    }
};

const getItem = (itemId: number, itemsMap: ItemsMap): GanttItemExecution => {
    if (itemsMap.has(itemId)) {
        const item = itemsMap.get(itemId);
        return { ...item, childrenIdList: [...(item.childrenIdList || [])] };
    }
};

const getChildren = (
    itemId: number,
    itemsMap: ItemsMap,
    includeWeightZero = true
): GanttItemExecution[] => {
    const includeItem = (item: GanttItemExecution) =>
        item.isActive && (includeWeightZero || !!item?.weight);
    if (itemsMap.has(itemId)) {
        return itemsMap
            .get(itemId)
            .childrenIdList?.map((id) => getItem(id, itemsMap))
            .filter(includeItem);
    }
    return [];
};

const addItem = (item: GanttItemExecution, itemsMap: ItemsMap): void => {
    itemsMap.set(item.id, item);
};

export const calculateRollup = (itemId: number, itemsMap: ItemsMap) => {
    const item = getItem(itemId, itemsMap);
    const parent = item?.parent && getItem(item.parent, itemsMap);
    const children = getChildren(
        (!!parent && parent.id) || item.id,
        itemsMap,
        false
    );
    calculateItemRollup(parent || item, children);
    addItem(parent || item, itemsMap);
    if (parent) {
        calculateRollup(parent.id, itemsMap);
    }
};

export const extractIds = (items: GanttItemExecution[]): number[] => {
    const parents: Set<number> = new Set();
    return items
        .filter((item) => !item.childrenIdList?.length)
        .reduce((leaves: number[], leaf: GanttItemExecution) => {
            if (!parents.has(leaf.parent)) {
                leaves.push(leaf.id);
                parents.add(leaf.parent);
            }
            return leaves;
        }, []);
};

export const updateMap = (
    itemsMap: ItemsMap,
    constraintDescriptors: ConstraintDescriptor[]
): void => {
    extractIds(Array.from(itemsMap.values())).forEach((node: number) =>
        calculateRollup(node, itemsMap)
    );
    applyConstraints(itemsMap, constraintDescriptors);
    alignCommissionDuration(itemsMap);
};

const alignCommissionDuration = (itemsMap: ItemsMap): void => {
    const commission = {
        ...[...(itemsMap.values() || [])].find((item) => item.level === 1)
    };
    const phases = [...(itemsMap.values() || [])].filter(
        (item) => item.level === 2
    );
    if (!!commission && !!phases.length) {
        updateForecast(commission, phases);
    }
    itemsMap.set(commission.id, commission);
};

const getPhasesByTypecode = (
    itemsMap: ItemsMap,
    phaseIdsMap: Map<string, number>,
    phases: Set<string>
): GanttItemExecution[] =>
    [...(phases.values() || [])]
        .map((typeCode) => phaseIdsMap.get(typeCode as TypeCodeUnion))
        .map((phaseId) => (phaseId != null && itemsMap.get(phaseId)) || null)
        .filter((i) => !!i);

const isMasterPhaseValid = (phase) => !!phase?.isActive && !phase.actualEndDate;
const isSlavePhaseValid = (phase) =>
    !!phase?.isActive && !phase.actualStartDate;

export const applyConstraints = (
    itemsMap: ItemsMap,
    constraintDescriptors: ConstraintDescriptor[]
) => {
    const phaseIdsMap = new Map(
        [...(itemsMap.values() || [])]
            .filter(isPhase)
            .map((phase) => [phase.typeCode, phase.id])
    );
    for (const descriptor of constraintDescriptors) {
        const masterPhases = getPhasesByTypecode(
            itemsMap,
            phaseIdsMap,
            descriptor.masterPhases
        ).filter(isMasterPhaseValid);
        const avaliableSlavePhases = getPhasesByTypecode(
            itemsMap,
            phaseIdsMap,
            descriptor.slavePhases
        );
        const slavePhases = avaliableSlavePhases?.filter(isSlavePhaseValid);
        if (avaliableSlavePhases?.length) {
            const slavePhase = { ...avaliableSlavePhases[0] };
            slavePhase.isSlaveOnConstraint = true;
            itemsMap.set(slavePhase.id, slavePhase);
        }
        if (!!masterPhases?.length && !!slavePhases?.length) {
            const slavePhase = { ...slavePhases[0] };
            const slavePhaseBaselineDuration = moment(
                slavePhase.baselineEndDate
            ).diff(slavePhase.baselineStartDate, 'days');
            const masterPhasesForecastEndDates = masterPhases
                .map((item) => item.forecastEndDate as moment.Moment)
                .filter((date) => !!date?.isValid());

            const masterPhasesForecastStartDates = masterPhases
                .map((item) => item.forecastStartDate as moment.Moment)
                .filter((date) => !!date?.isValid());

            switch (descriptor.type) {
                case ConstraintType.START_DATE:
                    slavePhase.forecastStartDate = moment(
                        getMinDate(...masterPhasesForecastStartDates)
                    ).add(descriptor.delay ?? 0, 'months');
                    break;
                case ConstraintType.END_DATE:
                    slavePhase.forecastStartDate = moment(
                        getMaxDate(...masterPhasesForecastEndDates)
                    ).add(descriptor.delay ?? 0, 'months');
                    break;
            }

            slavePhase.forecastEndDate = moment(
                slavePhase.forecastStartDate
            ).add(slavePhaseBaselineDuration, 'days');
            slavePhase.hasComputedForecastStartDate = true;
            itemsMap.set(slavePhase.id, slavePhase);
        }
    }
};
