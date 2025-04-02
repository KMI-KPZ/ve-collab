import { Component } from 'react';

interface TabProps {
    activeTab: string;
    tabid: string;
    tabname: string;
    children?: JSX.Element | JSX.Element[];
    onClick(tabid?: string): void;
    isNoAuthPreview?: boolean;
}

class Tab extends Component<TabProps, {}> {
    onClick = () => {
        const { tabid, onClick } = this.props;
        onClick(tabid);
    };

    render(): JSX.Element {
        const {
            onClick,
            props: { activeTab, tabid, tabname, isNoAuthPreview },
        } = this;

        return activeTab == tabid ? (
            <button
                className={`px-4 py-2 -mr-1 font-bold border-b-2 border-b-ve-collab-orange -mb-[1px] text-slate-900 text-lg ${
                    isNoAuthPreview
                        ? 'cursor-default'
                        : 'cursor-pointer hover:text-ve-collab-orange'
                }`}
                onClick={onClick}
            >
                {tabname}
            </button>
        ) : (
            <button
                className={`px-3 mx-1 py-2 text-slate-900 text-lg ${
                    isNoAuthPreview
                        ? 'cursor-default'
                        : 'cursor-pointer hover:text-ve-collab-orange'
                }`}
                onClick={onClick}
            >
                {tabname}
            </button>
        );
    }
}

export default Tab;
