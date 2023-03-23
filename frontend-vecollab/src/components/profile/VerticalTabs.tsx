import { Component } from "react";
import Tab from "./Tab";
import VerticalTab from "./VerticalTab";

interface TabsProps {
    children: JSX.Element[],
}

class Tabs extends Component<TabsProps, { activeTab: string }> {
    constructor(props: TabsProps) {
        super(props);

        this.state = {
            activeTab: this.props.children[0].props.tabname,
        };
    }

    onClickTabItem = (tab: string) => {
        this.setState({ activeTab: tab });
    };

    render() {
        const {
            onClickTabItem,
            props: { children },
            state: { activeTab },
        } = this;

        return (
            <div className={"flex"}>
                <div className={"w-1/3"}>
                    <ol className={"pb-2"}>
                        {children.map((child) => {
                            return (
                                <VerticalTab
                                    activeTab={activeTab}
                                    key={child.props.tabname}
                                    tabname={child.props.tabname}
                                    onClick={onClickTabItem}
                                />
                            );
                        })}
                    </ol>
                </div>
                <div className={"w-2/3 bg-red-500"}> {/* tab content wrapper*/}
                    {children.map((child) => {
                        if (child.props.tabname !== activeTab) return undefined;
                        return child.props.children;
                    })}
                </div>
            </div>
        );
    }
}

export default Tabs;