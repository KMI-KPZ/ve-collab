type Overwrite<T, U> = Omit<T, keyof U> & U;

export interface INode {
    id: number;
    parent: number;
    droppable: boolean;
    text: string;
    text_en: string;
    data?: Record<string, any>;
}

export type ITopLevelNode = Overwrite<INode, { parent: 0; droppable: false }>;

export interface IMaterialNode extends INode {
    droppable: false;
    data: {
        description: string;
        urls: {
            de: string;
            en: string;
        }
    };
}

export interface INodeWithLections extends INode {
    lections: INode[];
}

export interface ISearchMaterialWP {
    id: number;
    title: string;
    url: string;
}

export interface ISearchMaterial {
    id: number;
    text: string;
    section: INode;
    cluster: INode;
}
