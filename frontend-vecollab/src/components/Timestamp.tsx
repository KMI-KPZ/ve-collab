import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
    timestamp: string;
    className?: string;
    dateFormat?: string;
}

export default function Timestamp({
    timestamp,
    className = '',
    dateFormat = 'd. MMM yyyy H:mm'
}: Props) {
    return (
        <time
            className={className}
            dateTime={timestamp}
            title={format(parseISO(timestamp), 'd. MMM yyyy H:mm', {
                locale: de,
            })}
        >
            {format(parseISO(timestamp), dateFormat, {
                locale: de,
            })}
        </time>
    );
}
