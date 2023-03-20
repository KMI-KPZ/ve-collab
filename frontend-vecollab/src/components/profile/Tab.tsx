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

    let className = "tab-list-item";

    if (activeTab === tabname) {
      className += " tab-list-active";
    }

    return (
      <li className={className} onClick={onClick}>
        {tabname}
      </li>
    );
  }
}

export default Tab;