import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Props {
    timestamp: string;
}

export default function SmallTimestamp({ timestamp }: Props) {
    return (
        <time className="text-sm" dateTime={timestamp}>
            {format(parseISO(timestamp), 'd. MMM yyyy H:mm', {
                locale: de,
            })}
        </time>
    );
}
