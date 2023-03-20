import { Component } from "react";

interface TabProps {
  activeTab: string,
  tabname: string,
  children?: JSX.Element | JSX.Element[],
  onClick(tabname?: string): void
}

class Tab extends Component<TabProps, {}> {

  onClick = () => {
    const { tabname, onClick } = this.props;
    onClick(tabname);
  };

  render(): JSX.Element {
    const {
      onClick,
      props: { activeTab, tabname },
    } = this;

    return activeTab == tabname ?
      (
        <button className={"-mb-[1px] px-3 py-2 bg-white border-l border-t border-r border-b-0"} onClick={onClick}>
          {tabname}
        </button>
      )
      :
      (
        <button className={"-mb-[1px] px-3 py-2"} onClick={onClick}>
          {tabname}
        </button>
      );
  }
}

export default Tab;