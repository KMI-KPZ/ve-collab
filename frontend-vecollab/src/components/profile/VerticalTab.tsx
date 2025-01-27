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
            <div
                className={`px-3 mx-1 py-2 text-slate-900 font-bold text-ve-collab-blue ${
                    isNoAuthPreview ? 'cursor-default' : 'cursor-pointer'
                }`}
                onClick={onClick}
            >
                {tabname}
            </div>
        ) : (
            <div
                className={`px-3 mx-1 py-2 text-slate-900 ${
                    isNoAuthPreview ? 'cursor-default' : 'cursor-pointer'
                }`}
                onClick={onClick}
            >
                {tabname}
            </div>
        );
    }
}

export default Tab;
