import { format, formatDistance, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
    timestamp: string;
    className?: string;
    dateFormat?: string;
    relative?: boolean;
    showTitle?: boolean
}

export default function Timestamp({
    timestamp,
    className = '',
    dateFormat = 'd. MMM yyyy H:mm',
    relative = false,
    showTitle = false
}: Props) {
    return (
        <>
            {relative ? (
                <span
                    className={className}
                    title={showTitle ? format(parseISO(timestamp), 'd. MMM yyyy H:mm', { locale: de }) : ""}
                >
                    {formatDistance(parseISO(timestamp), new Date(), { locale: de, addSuffix: true}  )}
                </span>
            ) : (
                <time
                    className={className}
                    dateTime={timestamp}
                    title={showTitle ? format(parseISO(timestamp), 'd. MMM yyyy H:mm', { locale: de }) : ""}
                >
                    {format(parseISO(timestamp), dateFormat, {
                        locale: de,
                    })}
                </time>
            )}
        </>
    );
}
