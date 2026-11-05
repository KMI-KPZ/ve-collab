import { Method } from '@/interfaces/method/methodInterfaces';
import { MdChevronRight } from 'react-icons/md';
import { FaStar, FaRegStar } from 'react-icons/fa';

function StarRating({ rating }: { rating: number }) {
    const filled = Math.round(rating ?? 0);
    return (
        <div className="flex text-gray-400">
            {[1, 2, 3, 4, 5].map((i) =>
                i <= filled ? <FaStar key={i} size={12} /> : <FaRegStar key={i} size={12} />
            )}
        </div>
    );
}

interface MethodListProps {
    methods: Method[];
    selectedMethodId: string | null;
    onSelectMethod: (id: string) => void;
}

export default function MethodList({ methods, selectedMethodId, onSelectMethod }: MethodListProps) {
    return (
        <div className="h-full overflow-y-auto">
            <ul className="divide-y divide-gray-200">
                {methods.length === 0 && (
                    <li className="p-4 text-sm text-gray-500 text-center">
                        Keine Methoden gefunden.
                    </li>
                )}
                {methods.map((method) => (
                    <li
                        key={method.id}
                        onClick={() => onSelectMethod(method.id)}
                        className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedMethodId === method.id
                                ? 'bg-ve-collab-blue-light border-l-4 border-ve-collab-blue'
                                : ''
                        }`}
                    >
                        {method.thumbnail && (
                            <img
                                src={method.thumbnail}
                                alt=""
                                className="w-10 h-10 object-cover rounded flex-shrink-0"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{method.title}</div>
                            <StarRating rating={method.userRating ?? 0} />
                        </div>
                        <MdChevronRight className="text-gray-400 flex-shrink-0" size={20} />
                    </li>
                ))}
            </ul>
        </div>
    );
}
