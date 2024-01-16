import { useDrag, useDrop, DropTargetMonitor } from 'react-dnd';

interface BoxProps {
    id: string;
    text: string;
    index: number;
    moveBox: (dragIndex: number, hoverIndex: number) => void;
}

export default function Box({ id, text, index, moveBox }: BoxProps) {
    const [, ref] = useDrag({
        type: 'BOX',
        item: { id, index },
    });

    const [, drop] = useDrop({
        accept: 'BOX',
        hover: (item: { id: string; index: number }, monitor: DropTargetMonitor) => {
            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex !== hoverIndex) {
                moveBox(dragIndex, hoverIndex);
                item.index = hoverIndex;
            }
        },
    });

    return (
        <div
            ref={(node) => ref(drop(node))}
            style={{ border: '1px solid #000', padding: '8px', marginBottom: '4px' }}
        >
            {text}
        </div>
    );
}
