import { format, formatDistance, parseISO } from 'date-fns';
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
    dateFormat = 'd. MMM yyyy H:mm',
    relative = false,
    showTitle = false,
}: Props) {
    const router = useRouter();

    return (
        <>
            {relative ? (
                <span
                    className={className}
                    title={
                        showTitle
                            ? format(parseISO(timestamp), 'd. MMM yyyy H:mm', {
                                  locale: router.locale === 'de' ? de : enGB,
                              })
                            : ''
                    }
                >
                    {formatDistance(parseISO(timestamp), new Date(), {
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
                            ? format(parseISO(timestamp), 'd. MMM yyyy H:mm', {
                                  locale: router.locale === 'de' ? de : enGB,
                              })
                            : ''
                    }
                >
                    {format(parseISO(timestamp), dateFormat, {
                        locale: router.locale === 'de' ? de : enGB,
                    })}
                </time>
            )}
        </>
    );
}
