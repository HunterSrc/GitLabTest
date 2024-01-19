import { Interval } from '../@model/interval.model';

// Calcola la fine di una durata
export const computeEnd = (duration: Interval): number =>
  duration.start + duration.duration;

// Date due durate ritorna quella che inizia per prima
export const getMin = (d1: Interval, d2: Interval): Interval =>
  d1.start <= d2.start ? d1 : d2;

// Date due durate ritorna quella che inizia per ultima
export const getMax = (d1: Interval, d2: Interval): Interval =>
  getMin(d1, d2) === d1 ? d2 : d1;

// Date due durate ordinate temporalmente:
// se è presente una sovrapposizione, ritrona una PhaseDuration con durata positiva che rappresenta l'intervallo di sovrapposizione
// se non sono presenti sovrapposizioni, ritorna una Phase duration con durata negativa che rappresenta il gap tra le due durate
export const getOverlapOrdered = (
  first: Interval,
  second: Interval
): Interval => {
  const firstEnds = computeEnd(first);
  return {
    start: firstEnds > second.start ? second.start : firstEnds,
    duration: firstEnds - second.start
  };
};

export const getOverlap = (p1: Interval, p2: Interval): Interval =>
  getOverlapOrdered(getMin(p1, p2), getMax(p1, p2));

// Unisce due durate sovrapposte o disgiunte
export const mergePhaseDurations = (p1: Interval, p2: Interval): Interval => {
  const first = getMin(p1, p2);
  const second = getMax(p1, p2);
  const firstEnds = computeEnd(first);
  const secondEnds = computeEnd(second);

  if (first.start <= second.start && firstEnds >= secondEnds) {
    return { ...first };
  }
  if (second.start <= first.start && secondEnds > firstEnds) {
    return { ...second };
  }

  const overlap = getOverlapOrdered(first, second);
  return first.start && first.duration
    ? {
        start: first.start,
        duration: first.duration - overlap.duration + second.duration
      }
    : second;
};

// Mette in sequenza temporale una lista di durate basandosi sull'istante iniziale
export const sortPhaseDurations = (toSort: Interval[]): Interval[] =>
  toSort.sort((p1, p2) => p1.start - p2.start);

// Unisce una sequenza di sequenze sovrapposte o disgiunte
export const mergePhaseDurationSequence = (toMerge: Interval[]): Interval =>
  sortPhaseDurations(toMerge)
    .filter((item) => item.duration && item.start)
    .reduce((p1, p2, i) => mergePhaseDurations(p1, p2), {
      start: 1,
      duration: 0
    });

// Questa funzione viene usata per calcolare l'intervallo minimo capace di contenere una durata e dei valori puntuali dati in input
export const mergeDurationAndPoints = (
  d: Interval,
  points: number[] = []
): Interval => {
  const nomrmalizedPoints = points.filter((p) => !!p);
  const phaseEnd = computeEnd(d);
  if (nomrmalizedPoints.length > 0) {
    const point = nomrmalizedPoints[0];
    let start = d.start <= point ? d.start : point;
    let end = phaseEnd >= point ? phaseEnd : point;
    let duration = end - start > 0 ? end - start : 0;
    for (const p of nomrmalizedPoints.slice(1)) {
      start = start <= p ? start : p;
      end = end >= p ? end : p;
      duration = end - start > 0 ? end - start : 0;
    }
    return { start, duration };
  }
  return d;
};
