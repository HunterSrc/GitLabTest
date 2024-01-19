export const ROWSIZE = 25;
export const COLSIZE = 40;
export const MIN_COLS = 24;

export const ONE_FR = '1fr';
export const FULL_WIDTH = 'calc(100% - 1px)';

export const BAR_HEIGHT = 17;
export const BAR_MARGIN = 4;

export const PHASE_COLOR = '#ABDC94';
export const COMMISSION_COLOR = '#FCBA03';
export const PROJECT_COLOR = '#FC8803';
export const INACTIVE = 'rgba(0,0,0,0.25)';

interface GanttConfig {
  rowSize: number;
  colSize: number;
  minCols: number;
  barHeight: number;
  barMargin: number;
  phaseColor: string;
  commissionColor: string;
  projectColor: string;
  inactive: string;
}

const screenConfig: GanttConfig = {
  rowSize: 25,
  colSize: 25,
  minCols: 24,
  barHeight: 17,
  barMargin: 4,
  phaseColor: '#ABDC94',
  commissionColor: '#FCBA03',
  projectColor: '#FC8803',
  inactive: 'rgba(0,0,0,0.25)'
};

const exportConfig: GanttConfig = {
  rowSize: 50,
  colSize: 15,
  minCols: 60,
  barHeight: 17,
  barMargin: 4,
  phaseColor: '#ABDC94',
  commissionColor: '#FCBA03',
  projectColor: '#FC8803',
  inactive: 'rgba(0,0,0,0.25)'
};
