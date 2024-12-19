import { Component } from 'react';
import Tab from './Tab';

interface TabsProps {
    children: JSX.Element[];
    isNoAuthPreview?: boolean;
}

class Tabs extends Component<TabsProps, { activeTab: string }> {
    constructor(props: TabsProps) {
        super(props);

        this.state = {
            activeTab: this.props.children[0].props.tabid,
        };
    }

    onClickTabItem = (tab: string) => {
        if (this.props.isNoAuthPreview) return;

        this.setState({ activeTab: tab });
    };

    render() {
        const {
            onClickTabItem,
            props: { children },
            state: { activeTab },
        } = this;

        return (
            <div className={'w-full'}>
                <ol className={'flex pb-2 border-b'}>
                    {children.map((child) => {
                        return (
                            <Tab
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
                <div className={'mt-6'}>
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
