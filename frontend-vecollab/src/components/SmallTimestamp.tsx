import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
    timestamp: string;
    className?: string;
}

export default function SmallTimestamp({ timestamp, className }: Props) {
    return (
        <time
            className={'text-sm' + ' ' + className !== undefined ? className : ''}
            dateTime={timestamp}
        >
            {format(parseISO(timestamp), 'd. MMM yyyy H:mm', {
                locale: de,
            })}
        </time>
    );
}
