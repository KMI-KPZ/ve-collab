import { Component } from "react";
import Tab from "./Tab";

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
      <div className={"tabs w-full"}>
        <ol className={"tab-list flex justify-center"}>
          {children.map((child) => {
            const { tabname } = child.props;

            return (
              <Tab
                activeTab={activeTab}
                key={tabname}
                tabname={tabname}
                onClick={onClickTabItem}
              />
            );
          })}
        </ol>
        <div className="tab-content">
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