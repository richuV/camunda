import React from 'react';
import PropTypes from 'prop-types';

import {ReactComponent as Down} from 'modules/components/Icon/down.svg';

import {DROPDOWN_PLACEMENT} from 'modules/constants';

import Menu from './Menu';
import SubMenu from './SubMenu';
import Option from './Option';
import SubOption from './SubOption';

import * as Styled from './styled';

export default class Dropdown extends React.Component {
  static propTypes = {
    /** The content that is visible on the dropdown trigger. */
    label: PropTypes.node.isRequired,
    /** Defines if the dropdown content opens to the top or bottom.*/
    placement: PropTypes.oneOf(['top', 'bottom']),
    /** The options of this dropdown. Each child should be a `Dropdown.Option` instance */
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node
    ]),
    buttonStyles: PropTypes.array,
    disabled: PropTypes.bool,
    onOpen: PropTypes.func
  };

  state = {
    isOpen: false,
    isSubMenuOpen: false,
    isSubmenuFixed: false,
    isFocused: false
  };

  componentDidMount() {
    document.body.addEventListener('click', this.onClose, true);
  }

  componentWillUnmount() {
    document.body.removeEventListener('click', this.onClose, true);
  }

  handleKeyPress = evt => {
    //The space bar is interpreted as empty evt.key by react;
    if (evt && evt.key !== 'Tab' && evt.key !== 'Enter' && evt.key !== '') {
      evt.preventDefault();
    }

    if (evt && evt.key === 'Escape') {
      this.onClose({});
    }
  };

  setRef = node => {
    this.container = node;
  };

  handleStateChange = changes => {
    this.setState(changes);
  };

  resetState = () => {
    this.setState({
      isOpen: false,
      isSubMenuOpen: false,
      isSubmenuFixed: false
    });
  };

  onClose = ({target}) => {
    if (!this.container || !this.container.contains(target) || !target) {
      this.resetState();
    }
  };

  handleOnClick = () => {
    if (!this.state.isOpen && this.props.onOpen) {
      this.props.onOpen();
    }

    !this.state.isOpen
      ? this.setState({isOpen: !this.state.isOpen})
      : this.resetState();
  };

  renderChildrenWithProps = () =>
    React.Children.map(this.props.children, (child, index) => {
      return React.cloneElement(child, {
        isSubMenuOpen: this.state.isSubMenuOpen,
        isSubmenuFixed: this.state.isSubmenuFixed,
        onStateChange: this.handleStateChange,
        placement: this.props.placement
      });
    });

  renderLabel = () =>
    typeof this.props.label === 'string' ? (
      <Styled.LabelWrapper>{this.props.label}</Styled.LabelWrapper>
    ) : (
      this.props.label
    );

  render() {
    const {isOpen} = this.state;
    const {placement} = this.props;
    return (
      <Styled.Dropdown ref={this.setRef}>
        <Styled.Button
          data-test="dropdown-toggle"
          onKeyDown={this.handleKeyPress}
          buttonStyles={this.props.buttonStyles}
          disabled={this.props.disabled}
          onClick={() => this.handleOnClick()}
        >
          {this.renderLabel()}
          <Down />
        </Styled.Button>
        {isOpen && (
          <Menu
            onKeyDown={this.handleKeyPress}
            onStateChange={this.handleStateChange}
            placement={placement}
          >
            {this.renderChildrenWithProps()}
          </Menu>
        )}
      </Styled.Dropdown>
    );
  }
}

Dropdown.defaultProps = {
  placement: DROPDOWN_PLACEMENT.BOTTOM
};

// export Dropdown-option component
Dropdown.Option = Option;
Dropdown.SubMenu = SubMenu;
Dropdown.SubOption = SubOption;
