import React, { Component } from "react";
import PropTypes from "prop-types";

class Tab extends Component {
  static propTypes = {
    activeTab: PropTypes.string.isRequired,
    tabname: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
  };

  onClick = () => {
    const { tabname, onClick } = this.props;
    onClick(tabname);
  };

  render() {
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