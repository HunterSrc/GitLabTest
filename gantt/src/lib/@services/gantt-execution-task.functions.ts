import * as moment from 'moment';
import { GanttItemExecution, ItemsMap } from '../@model/gantt-item-execution.model';
import { GanttItemTemporal } from '../@model/gantt-item-temporal.model';
import { TypeCodeEnum } from '../@model/type-code.enum';

export const toMap =
    <T extends GanttItemExecution | GanttItemTemporal>(items: T[]): Map<number, T> =>
        new Map(items.filter(i => !!i).map(item => [item.id, item]));

export const collapseAll = <T extends GanttItemExecution | GanttItemTemporal>(map: Map<number, T>): void => {
    Array.from(map.keys()).forEach(key => {
        const item = map.get(key);
        if (item && item.collapsable) {
            const _item = { ...item };
            _item.collapsed = false;
            _item.childrenIdList?.forEach(id => hide(id, map));
            _item.collapsable = isItemCollapsable(item as GanttItemExecution);
            map.set(item.id, _item);
        }
    });
};

export const toggleCollapse = <T extends GanttItemExecution | GanttItemTemporal>(itemId: number, map: Map<number, T>): void => {
    const item = map.get(itemId);
    if (item && item.collapsable) {
        const _item = {...item };
        if (item.collapsed) {
            _item.collapsed = false;
            _item.childrenIdList?.forEach(id => hide(id, map));
        } else {
            _item.collapsed = true;
            _item.childrenIdList?.forEach(id => {
                if (map.has(id)) {
                    map.get(id).visible = true;
                    map.get(id).childrenIdList?.forEach(childId => hide(childId, map));
                }
            });
        }
        map.set(itemId, _item);
    }
};

export const setActivation = <T extends GanttItemExecution | GanttItemTemporal>(id: number, map: Map<number, T>, value: boolean): void => {
    const item = { ...map.get(id) };
    if (!!item) {
        item.isActive = value;
        map.set(id, item);
        item.childrenIdList?.forEach(_id => setActivation(_id, map, value));
    }
};

export const toggleActivation = <T extends GanttItemExecution | GanttItemTemporal>(
    itemId: number,
    siblings: number[],
    map: Map<number, T>): void => {
        const _item = map.get(itemId);
        if (!!(_item?.level > 1)) {
            const item = { ..._item};
            const idsToUpdate = [ ...siblings ];
            const value = !item.isActive;
            if (!value) {
                setWeight(itemId, map, 0);
                setActivation(itemId, map, false);
            } else {
                idsToUpdate.push(itemId);
            }
            const weight = Math.floor(100 / idsToUpdate.length);
            const lastWeight = 100 - (weight * (idsToUpdate.length - 1));
            idsToUpdate
                .forEach((id, i)  => setWeight(id, map, i === siblings.length - 1 ? lastWeight : weight, id === itemId));
        }
};

export const hide = <T extends GanttItemExecution | GanttItemTemporal>(itemId: number, map: Map<number, T>): void => {
    const item = map.get(itemId);
    if (item) {
        const _item = { ...item };
        _item.collapsed = false;
        _item.visible = false;
        _item.childrenIdList?.forEach(id => hide(id, map));
        map.set(itemId, _item);
    }
};

export const getSiblings = <T extends GanttItemExecution | GanttItemTemporal>(itemId: number, map: Map<number, T>): number[] => {
    const current = map.get(itemId);
    if (!!current) {
        return [ ...(map.values() || [])]
            .filter(item => item.parent === current.parent && item.id !== current.id && !!item.isActive)
            .sort((i1, i2) => !!i1 && !!i2 && i1.order - i2.order || 0)
            .map(item => item.id);
    }
    return [];
};

export const setWeight = <T extends GanttItemExecution | GanttItemTemporal>(
    itemId: number,
    map: Map<number, T>,
    weight: number,
    doToggleActivation: boolean = false): void => {
        const item = map.get(itemId);
        if (!!item) {
            const _item = { ...item };
            _item.weight = weight;
            if (!!doToggleActivation) {
                _item.isActive = !_item.isActive;
            }
            map.set(itemId, _item);
        }
};

export const spreadItem = <T extends GanttItemExecution | GanttItemTemporal>(item: T, map: Map<number, T>, accumulator: T[] = []): T[] =>
    item.childrenIdList?.length ?
        item.childrenIdList
            ?.map(childId => map.get(childId))
            .sort((a, b) => a.order - b.order)
            .reduce((acc, current) => [...acc, current, ...spreadItem(current, map)], [...accumulator]) :
        [...accumulator];

export const sort =
    <T extends GanttItemExecution | GanttItemTemporal>(items: T[], projectId: number, map?: Map<number, T>): T[] => {
        const project: T = map?.get(projectId);
        if (project) {
            return spreadItem(project, map || toMap(items), [project]);
        }
};

export const isPhase = <T extends GanttItemExecution | GanttItemTemporal>(item: T): boolean =>
    [
    TypeCodeEnum.ENGINEERING,
    TypeCodeEnum.MATERIALS,
    TypeCodeEnum.AUTHORIZATIONS,
    TypeCodeEnum.JOB_PROCUREMENT,
    TypeCodeEnum.CONSTRUCTION,
    TypeCodeEnum.ENTRY_INTO_SERVICE
    ].some(type => type === TypeCodeEnum[item?.typeCode]) || item?.level === 2;

export const isCommission = <T extends GanttItemExecution | GanttItemTemporal>(item: T): boolean =>
    TypeCodeEnum.COMMISSION === TypeCodeEnum[item?.typeCode] || item?.level === 1;

export const isProject = <T extends GanttItemExecution | GanttItemTemporal>(item: T): boolean =>
    TypeCodeEnum.NR_PROJECT === TypeCodeEnum[item?.typeCode] || item?.level === 0;

export const isBatch = (item: GanttItemExecution): boolean =>
    TypeCodeEnum.BATCH === TypeCodeEnum[item?.typeCode];

export const isBatchClosable = (item: GanttItemExecution): boolean =>
    isBatch(item) && !((item.actualEndDate as moment.Moment)?.isValid()) && item.progress <= 100;

export const closeBatch = (itemId: number, map: ItemsMap): void => {
    const item = map.get(itemId);
    if (item) {
        const _item = { ...item };
        _item.actualEndDate = moment();
        _item.progress = 100;
        map.set(itemId, _item);
    }
};

export const isBatchAssociable = (item: GanttItemExecution): boolean =>{
    return TypeCodeEnum.TENDER_CALLS === TypeCodeEnum[item?.typeCode];
}


export const isLowLevel = (item: GanttItemExecution): boolean =>
    !!item && (isCommission(item) || isPhase(item));

const forbiddenTypeCodes = new Set();

const isItemCollapsable = (item: GanttItemExecution): boolean =>
    !!item.childrenIdList?.length && !forbiddenTypeCodes.has(item.typeCode);

export const fixOutOfBoundValue = (value: number): number => {
    if (value < 0) {
        return 0;
    }
    if (value > 100) {
        return 100;
    }
    return Math.round(value);
};

export const isBatchPublicPermission = (item: GanttItemExecution): boolean => TypeCodeEnum.PUB_AUTHORIZATIONS === TypeCodeEnum[item?.typeCode];