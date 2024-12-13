import { Component } from 'react';
import VerticalTab from './VerticalTab';

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
            <div className={'flex'}>
                <div className={'w-1/4'}>
                    <ol className={'pb-2'}>
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
                <div className={'w-3/4 mx-14'}>
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
