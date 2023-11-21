import { WorkExperience } from '@/interfaces/profile/profileInterfaces';
import moment from 'moment';
import { RxDotFilled } from 'react-icons/rx';

export function CVWorkItem({
    position,
    institution,
    timestamp_from,
    timestamp_to,
    city,
    country,
    additional_info,
}: WorkExperience) {
    const preciseDiff = (d1: string, d2: string) => {
        var m1 = moment(d1),
            m2 = moment(d2),
            firstDateWasLater;

        m1.add(m2.utcOffset() - m1.utcOffset(), 'minutes'); // shift timezone of m1 to m2

        if (m1.isSame(m2)) {
            return {
                years: 0,
                months: 0,
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                firstDateWasLater: 0,
            };
        }
        if (m1.isAfter(m2)) {
            var tmp = m1;
            m1 = m2;
            m2 = tmp;
            firstDateWasLater = true;
        } else {
            firstDateWasLater = false;
        }

        var yDiff = m2.year() - m1.year();
        var mDiff = m2.month() - m1.month();
        var dDiff = m2.date() - m1.date();
        var hourDiff = m2.hour() - m1.hour();
        var minDiff = m2.minute() - m1.minute();
        var secDiff = m2.second() - m1.second();

        if (secDiff < 0) {
            secDiff = 60 + secDiff;
            minDiff--;
        }
        if (minDiff < 0) {
            minDiff = 60 + minDiff;
            hourDiff--;
        }
        if (hourDiff < 0) {
            hourDiff = 24 + hourDiff;
            dDiff--;
        }
        if (dDiff < 0) {
            var daysInLastFullMonth = moment(m2.year() + '-' + (m2.month() + 1), 'YYYY-MM')
                .subtract(1, 'M')
                .daysInMonth();
            if (daysInLastFullMonth < m1.date()) {
                // 31/01 -> 2/03
                dDiff = daysInLastFullMonth + dDiff + (m1.date() - daysInLastFullMonth);
            } else {
                dDiff = daysInLastFullMonth + dDiff;
            }
            mDiff--;
        }
        if (mDiff < 0) {
            mDiff = 12 + mDiff;
            yDiff--;
        }

        return {
            years: yDiff,
            months: mDiff,
            days: dDiff,
            hours: hourDiff,
            minutes: minDiff,
            seconds: secDiff,
            firstDateWasLater: firstDateWasLater,
        };
    };

    let startMoment = moment(timestamp_from);
    let endMoment = moment(timestamp_to);
    let diff = preciseDiff(timestamp_from, timestamp_to);

    return (
        <li className={'py-3'}>
            <div className={'font-bold'}>{position}</div>
            <div className={'flex items-center'}>
                <div>{institution}</div>
            </div>
            <div className={'flex items-center text-sm text-gray-600'}>
                <div>{`${startMoment.month() + 1}/${startMoment.year()} - ${
                    endMoment.month() + 1
                }/${endMoment.year()}`}</div>
                <RxDotFilled />
                <div>
                    {diff.years > 0 ? (
                        <>{`${diff.years} Jahre, ${diff.months} Monate`}</>
                    ) : (
                        <>{`${diff.months} Monate`}</>
                    )}
                </div>
            </div>
            <div className={'text-sm text-gray-600'}>
                {city}, {country}
            </div>
            <div className={'mt-1'}>{additional_info}</div>
        </li>
    );
}
