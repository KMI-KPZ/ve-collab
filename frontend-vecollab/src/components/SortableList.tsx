import { useState } from 'react';
import Box from '@/components/Box';

interface SortableListProps {
    initialBoxes: { id: string; text: string }[];
}

export default function SortableList({ initialBoxes }: SortableListProps) {
    const [boxes, setBoxes] = useState(initialBoxes);

    const moveBox = (dragIndex: number, hoverIndex: number) => {
        const newBoxes = [...boxes];
        const draggedBox = newBoxes[dragIndex];

        newBoxes.splice(dragIndex, 1);
        newBoxes.splice(hoverIndex, 0, draggedBox);

        setBoxes(newBoxes);
    };

    return (
        <div>
            {boxes.map((box, index) => (
                <Box key={box.id} id={box.id} text={box.text} index={index} moveBox={moveBox} />
            ))}
        </div>
    );
}
