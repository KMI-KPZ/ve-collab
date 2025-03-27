import { Component } from 'react';
import VerticalTab from './VerticalTab';

interface TabsProps {
    children: JSX.Element[];
    isNoAuthPreview?: boolean;
    onClickTabItem?: (activeTab: string) => void;
    className?: string;
    navClassName?: string;
}

class Tabs extends Component<TabsProps, { activeTab: string }> {
    constructor(props: TabsProps) {
        super(props);

        this.state = {
            activeTab: this.props.children[0].props.tabid,
        };
    }

    componentDidMount = () => {
        const tab = this.getTabFromURL();

        if (tab) this.onClickTabItem(tab);
    };

    componentDidUpdate(
        prevProps: Readonly<TabsProps>,
        prevState: Readonly<{ activeTab: string }>,
        snapshot?: any
    ): void {
        // console.log('update ...');
    }

    getTabFromURL = () => {
        const currentUrl = document.URL,
            urlParts = currentUrl.split('#');

        if (urlParts.length == 0 || !urlParts[1]?.startsWith('tab')) return null;

        let tab = urlParts[1].replace('tab', '');
        return this.props.children.find((a) => a.props.tabid == tab) == undefined ? null : tab;
    };

    onClickTabItem = (tab: string) => {
        if (this.props.isNoAuthPreview) return;

        this.setState({ activeTab: tab });
        if (this.props.onClickTabItem) {
            this.props.onClickTabItem(tab);
        }
    };

    render() {
        const {
            onClickTabItem,
            props: { children },
            state: { activeTab },
        } = this;

        return (
            <div className={`flex ${this.props.className ? this.props.className : ''}`}>
                <div className={'w-1/4'}>
                    <ol
                        className={`pb-2 divide-y divide-gray-200 ${
                            this.props.navClassName ? this.props.navClassName : ''
                        }`}
                    >
                        {children.map((child) => {
                            return (
                                <VerticalTab
                                    activeTab={activeTab}
                                    key={child.props.tabname}
                                    tabid={child.props.tabid}
                                    tabname={child.props.tabname}
                                    onClick={onClickTabItem}
                                    isNoAuthPreview={this.props.isNoAuthPreview}
                                />
                            );
                        })}
                    </ol>
                </div>
                <div className={'w-3/4 mx-4 lg:mx-10'}>
                    {/* tab content wrapper*/}
                    {children.map((child) => {
                        if (child.props.tabid !== activeTab) return undefined;
                        return child.props.children;
                    })}
                </div>
            </div>
        );
    }
}

export default Tabs;
