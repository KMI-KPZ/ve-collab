import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
    timestamp: string;
    className?: string;
}

export default function Timestamp({ timestamp, className }: Props) {
    return (
        <time
            className={className !== undefined ? className : ''}
            dateTime={timestamp}
        >
            {format(parseISO(timestamp), 'd. MMM yyyy H:mm', {
                locale: de,
            })}
        </time>
    );
}
