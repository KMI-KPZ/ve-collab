import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import SortableList from '@/components/SortableList';

export default function TestDND() {
    const initialBoxes = [
        { id: '1', text: 'Box 1' },
        { id: '2', text: 'Box 2' },
        { id: '3', text: 'Box 3' },
    ];
    return (
        <div className="App">
            <DndProvider backend={HTML5Backend}>
                <SortableList initialBoxes={initialBoxes} />
            </DndProvider>
        </div>
    );
}
