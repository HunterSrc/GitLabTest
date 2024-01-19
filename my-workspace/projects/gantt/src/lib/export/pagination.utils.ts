export const GANTT_PAGE_WIDTH = 36; // months

export type Activity = {
  startMonth: number;
  duration: number;
  isActive?: boolean;
  isMilestone?: boolean;
};

const getNumberOfPages = (project: Activity, paddingStart = 0) =>
  Math.ceil(calculateEnd(project, paddingStart) / GANTT_PAGE_WIDTH);

const calculateEnd = (activity: Activity, paddingStart = 0) =>
  activity.startMonth + paddingStart + activity.duration;

const isInRange = (value: number, range: number[], includeEnd = true) =>
  includeEnd
    ? range[0] <= value && value <= range[1]
    : range[0] <= value && value < range[1];

export const getRanges = (project: Activity, paddingStart = 0): number[][] =>
  new Array(getNumberOfPages(project, paddingStart))
    .fill([1, GANTT_PAGE_WIDTH])
    .map((item, i) => [
      item[0] + i * GANTT_PAGE_WIDTH,
      item[1] + i * GANTT_PAGE_WIDTH
    ]);

export const splitActivity = (
  activity: Activity,
  pageRanges: number[][],
  commissionMapMilestones = false
): number[][] => {
  const result = [];
  if (!activity.isMilestone) {
    const activityStart = activity.startMonth;
    const activityEnd = calculateEnd(activity);
    const startPageNumber = Math.floor(activityStart / GANTT_PAGE_WIDTH);
    const endPageNumber = Math.ceil(activityEnd / GANTT_PAGE_WIDTH);
    const offsetStart = activityStart % GANTT_PAGE_WIDTH || GANTT_PAGE_WIDTH;
    const offsetEnd = activityEnd % GANTT_PAGE_WIDTH || GANTT_PAGE_WIDTH;
    pageRanges.forEach((range, index) => {
      const start = isInRange(activityStart, range)
        ? offsetStart
        : +(index + 1 > startPageNumber);
      const end = isInRange(activityEnd, range)
        ? offsetEnd
        : +(index + 1 < endPageNumber) * GANTT_PAGE_WIDTH + 1;
      result.push([start, end, +!!activity.isActive]);
    });
  } else {
    const activityStart = activity.startMonth - 1;
    let page = Math.floor(activityStart / GANTT_PAGE_WIDTH);
    const offsetStart = activityStart % GANTT_PAGE_WIDTH;
    if (commissionMapMilestones && activityStart === GANTT_PAGE_WIDTH) {
      page -= 1;
    }
    pageRanges.forEach((_, index) => {
      const start = index === page ? offsetStart : -1;
      result.push([start, start, +!!activity.isActive]);
    });
  }
  return result;
};
