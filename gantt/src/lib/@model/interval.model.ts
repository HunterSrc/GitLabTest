import * as moment from 'moment';

export interface Interval {
    start: number;
    duration: number;
    startDate?: moment.Moment;
    endDate?: moment.Moment;
}
