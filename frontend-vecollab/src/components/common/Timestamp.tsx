import { format, formatDistance, parseISO, add } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import { useRouter } from 'next/router';

interface Props {
    timestamp: string;
    className?: string;
    dateFormat?: string;
    relative?: boolean;
    showTitle?: boolean;
}

export default function Timestamp({
    timestamp,
    className = '',
    dateFormat = "d. MMM yyyy H:mm 'Uhr'",
    relative = false,
    showTitle = false,
}: Props) {
    const router = useRouter();

    let isoDate = parseISO(timestamp);
    isoDate = add(isoDate, { minutes: -1 * isoDate.getTimezoneOffset() });

    return (
        <>
            {relative ? (
                <span
                    className={className}
                    title={
                        showTitle
                            ? format(isoDate, 'd. MMM yyyy H:mm', {
                                  locale: router.locale === 'de' ? de : enGB,
                              })
                            : ''
                    }
                >
                    {formatDistance(isoDate, new Date(), {
                        locale: router.locale === 'de' ? de : enGB,
                        addSuffix: true,
                    })}
                </span>
            ) : (
                <time
                    className={className}
                    dateTime={timestamp}
                    title={
                        showTitle
                            ? format(isoDate, 'd. MMM yyyy H:mm', {
                                  locale: router.locale === 'de' ? de : enGB,
                              })
                            : ''
                    }
                >
                    {format(isoDate, dateFormat, {
                        locale: router.locale === 'de' ? de : enGB,
                    })}
                </time>
            )}
        </>
    );
}
