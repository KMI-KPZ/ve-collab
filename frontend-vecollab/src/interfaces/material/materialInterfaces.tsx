export interface INode {
    id: number;
    parent: number;
    droppable: boolean;
    text: string;
    data?: Record<string, any>;
}

export interface ITopLevelNode extends INode {
    parent: 0;
    droppable: true;
}

export interface IMaterialNode extends INode {
    droppable: false;
    data: {
        url: string;
    };
}
