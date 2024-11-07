import { Component } from 'react';

interface TabProps {
    activeTab: string;
    tabid: string;
    tabname: string;
    children?: JSX.Element | JSX.Element[];
    onClick(tabid?: string): void;
}

class Tab extends Component<TabProps, {}> {
    onClick = () => {
        const { tabid, onClick } = this.props;
        onClick(tabid);
    };

    render(): JSX.Element {
        const {
            onClick,
            props: { activeTab, tabid, tabname },
        } = this;

        return activeTab == tabid ? (
            <button
                className={
                    'px-3 mx-1 py-2 rounded-xl border border-white hover:border-ve-collab-orange font-bold text-slate-900 bg-ve-collab-orange-light'
                }
                onClick={onClick}
            >
                {tabname}
            </button>
        ) : (
            <button
                className={
                    'px-3 mx-1 py-2 rounded-xl border border-white hover:border-ve-collab-orange font-bold text-slate-900'
                }
                onClick={onClick}
            >
                {tabname}
            </button>
        );
    }
}

export default Tab;
