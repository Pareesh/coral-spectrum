/**
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {BaseLabellable} from '../../../coral-base-labellable';
import {Icon} from '../../../coral-component-icon';
import {transform, validate, commons} from '../../../coral-utils';

/**
 Enumeration for {@link Button}, {@link AnchorButton} icon sizes.

 @typedef {Object} ButtonIconSizeEnum

 @property {String} EXTRA_EXTRA_SMALL
 Extra extra small size icon, typically 9px size.
 @property {String} EXTRA_SMALL
 Extra small size icon, typically 12px size.
 @property {String} SMALL
 Small size icon, typically 18px size. This is the default size.
 @property {String} MEDIUM
 Medium size icon, typically 24px size.
 */
const iconSize = {};
const excludedIconSizes = [Icon.size.LARGE, Icon.size.EXTRA_LARGE, Icon.size.EXTRA_EXTRA_LARGE];
for (const key in Icon.size) {
  // Populate button icon sizes by excluding the largest icon sizes
  if (excludedIconSizes.indexOf(Icon.size[key]) === -1) {
    iconSize[key] = Icon.size[key];
  }
}

/**
 Enumeration for {@link Button}, {@link AnchorButton} variants.

 @typedef {Object} ButtonVariantEnum

 @property {String} CTA
 A button that is meant to grab the user's attention.
 @property {String} PRIMARY
 A button that is meant to grab the user's attention.
 @property {String} QUIET
 A quiet button that indicates that the button's action is the primary action.
 @property {String} SECONDARY
 A button that indicates that the button's action is the secondary action.
 @property {String} QUIET_SECONDARY
 A quiet secondary button.
 @property {String} ACTION
 An action button.
 @property {String} QUIET_ACTION
 A quiet action button.
 @property {String} MINIMAL
 A quiet minimalistic button.
 @property {String} WARNING
 A button that indicates that the button's action is dangerous.
 @property {String} QUIET_WARNING
 A quiet warning button,
 @property {String} OVER_BACKGROUND
 A button to be placed on top of colored background.
 @property {String} DEFAULT
 The default button look and feel.
 */
const variant = {
  CTA: 'cta',
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  QUIET: 'quiet',
  MINIMAL: 'minimal',
  WARNING: 'warning',
  ACTION: 'action',
  QUIET_ACTION: 'quietaction',
  QUIET_SECONDARY: 'quietsecondary',
  QUIET_WARNING: 'quietwarning',
  OVER_BACKGROUND: 'overbackground',
  DEFAULT: 'default',
  // Private to be used for custom Button classes like field buttons
  _CUSTOM: '_custom'
};

// the button's base classname
const CLASSNAME = '_coral-Button';
const ACTION_CLASSNAME = '_coral-ActionButton';

const ALL_VARIANT_CLASSES = [
  `${CLASSNAME}--cta`,
  `${CLASSNAME}--primary`,
  `${CLASSNAME}--secondary`,
  `${CLASSNAME}--warning`,
  `${CLASSNAME}--quiet`,
  `${ACTION_CLASSNAME}--quiet`,
  `${CLASSNAME}--overBackground`,
];

const VARIANT_MAP = {
  cta: [CLASSNAME, ALL_VARIANT_CLASSES[0]],
  primary: [CLASSNAME, ALL_VARIANT_CLASSES[0]],
  secondary: [CLASSNAME, ALL_VARIANT_CLASSES[2]],
  warning: [CLASSNAME, ALL_VARIANT_CLASSES[3]],
  quiet: [CLASSNAME, ALL_VARIANT_CLASSES[1], ALL_VARIANT_CLASSES[4]],
  minimal: [CLASSNAME, ALL_VARIANT_CLASSES[2], ALL_VARIANT_CLASSES[4]],
  default: [CLASSNAME, ALL_VARIANT_CLASSES[1]],
  action: [ACTION_CLASSNAME],
  quietaction: [ACTION_CLASSNAME, ALL_VARIANT_CLASSES[5]],
  quietsecondary: [CLASSNAME, ALL_VARIANT_CLASSES[2], ALL_VARIANT_CLASSES[4]],
  quietwarning: [CLASSNAME, ALL_VARIANT_CLASSES[3], ALL_VARIANT_CLASSES[4]],
  overbackground: [CLASSNAME, ALL_VARIANT_CLASSES[6]]
};

/**
 Enumeration for {@link BaseButton} sizes.

 @typedef {Object} ButtonSizeEnum

 @property {String} MEDIUM
 A medium button is the default, normal sized button.
 @property {String} LARGE
 Not supported. Falls back to MEDIUM.
 */
const size = {
  MEDIUM: 'M',
  LARGE: 'L'
};

/**
 Enumeration for {@link BaseButton} icon position options.

 @typedef {Object} ButtonIconPositionEnum

 @property {String} RIGHT
 Position should be right of the button label.
 @property {String} LEFT
 Position should be left of the button label.
 */
const iconPosition = {
  RIGHT: 'right',
  LEFT: 'left'
};

/**
 @base BaseButton
 @classdesc The base element for Button components
 */
const BaseButton = (superClass) => class extends BaseLabellable(superClass) {
  /** @ignore */
  constructor() {
    super();

    const self = this;

    // Templates
    self._elements = {
      // Create or fetch the label element
      label: self.querySelector(self._contentZoneTagName) || document.createElement(self._contentZoneTagName),
      icon: self.querySelector('coral-icon')
    };

    // Events
    self._events = {
      mousedown: '_onMouseDown',
      click: '_onClick'
    };

    super._observeLabel();
  }

  /**
   The label of the button.
   @type {HTMLElement}
   @contentzone
   */
  get label() {
    return this._getContentZone(this._elements.label);
  }

  set label(value) {
    const self = this;
    self._setContentZone('label', value, {
      handle: 'label',
      tagName: self._contentZoneTagName,
      insert: function (label) {
        // Update label styles
        self._updateLabel(label);

        // Ensure there's no extra space left for icon only buttons
        if (label.innerHTML.trim() === '') {
          label.textContent = '';
        }

        if (self.iconPosition === iconPosition.LEFT) {
          self.appendChild(label);
        } else {
          self.insertBefore(label, self.firstChild);
        }
      }
    });
  }

  /**
   Position of the icon relative to the label. If no <code>iconPosition</code> is provided, it will be set on the
   left side by default.
   See {@link ButtonIconPositionEnum}.

   @type {String}
   @default ButtonIconPositionEnum.LEFT
   @htmlattribute iconposition
   @htmlattributereflected
   */
  get iconPosition() {
    return this._iconPosition || iconPosition.LEFT;
  }

  set iconPosition(value) {
    const self = this;
    value = transform.toLowerCase(value);
    value = validate.enumeration(iconPosition)(value) && value || iconPosition.LEFT;

    self._updateProperty('_iconPosition', value, function(value) {
      self._reflectAttribute('iconposition', value);
      self._updateIcon(self.icon);
    });
  }

  /**
   Specifies the icon name used inside the button. See {@link Icon} for valid icon names.

   @type {String}
   @default ""
   @htmlattribute icon
   */
  get icon() {
    let elementsIcon = this._elements.icon;
    if (elementsIcon) {
      return elementsIcon.getAttribute('icon') || '';
    }

    return this._icon || '';
  }

  set icon(value) {
    value = transform.string(value);

    this._updateProperty('_icon', value, function(value) {
      this._updateIcon(value);
    });
  }

  /**
   Size of the icon. It accepts both lower and upper case sizes. See {@link ButtonIconSizeEnum}.

   @type {String}
   @default ButtonIconSizeEnum.SMALL
   @htmlattribute iconsize
   */
  get iconSize() {
    let elementsIcon = this._elements.icon;

    if (elementsIcon) {
      return elementsIcon.getAttribute('size') || Icon.size.SMALL;
    }
    return this._iconSize || Icon.size.SMALL;
  }

  set iconSize(value) {
    const self = this;
    value = transform.toUpperCase(value);
    value = validate.enumeration(Icon.size)(value) && value || Icon.size.SMALL;

    self._updateProperty('_iconSize', value, function(value) {
      if (self._updatedIcon) {
        self._getIconElement().setAttribute('size', value);
      }
    });
  }

  /**
   Whether aria-label is set automatically. See {@link IconAutoAriaLabelEnum}.

   @type {String}
   @default IconAutoAriaLabelEnum.OFF
   @htmlattribute autoarialabel
   */
  get iconAutoAriaLabel() {
    const self = this;
    let _elementsIcon = self._elements.icon;
    if (_elementsIcon) {
      return _elementsIcon.getAttribute('autoarialabel') || Icon.autoAriaLabel.OFF;
    }
    return self._iconAutoAriaLabel || Icon.autoAriaLabel.OFF;
  }

  set iconAutoAriaLabel(value) {
    const self = this;
    value = transform.toLowerCase();
    value = validate.enumeration(Icon.autoAriaLabel)(value) && value || Icon.autoAriaLabel.OFF;

    self._updateProperty('_iconAutoAriaLabel', value, function(value) {
      if (self._updatedIcon) {
        self._getIconElement().setAttribute('autoarialabel', value);
      }
    });
  }

  /**
   The size of the button. It accepts both lower and upper case sizes. See {@link ButtonSizeEnum}.
   Currently only "MEDIUM" is supported.

   @type {String}
   @default ButtonSizeEnum.MEDIUM
   @htmlattribute size
   @htmlattributereflected
   */
  get size() {
    return this._size || size.MEDIUM;
  }

  set size(value) {
    let self = this;
    value = transform.toUpperCase(value);
    value = validate.enumeration(size)(value) && value || size.MEDIUM;

    self._updateProperty('_size', value, function(value) {
      self._reflectAttribute('size', value);
    });
  }

  /**
   Whether the button is selected.

   @type {Boolean}
   @default false
   @htmlattribute selected
   @htmlattributereflected
   */
  get selected() {
    return this._selected || false;
  }

  set selected(value) {
    const self = this;
    value = transform.booleanAttr(value);

    self._updateProperty('_selected', value, function(value) {
      self._reflectAttribute('selected', value);
      self.classList.toggle('is-selected', value);
      self.trigger('coral-button:_selectedchanged');
    });
  }

  // We just reflect it but we also trigger an event to be used by button group
  /** @ignore */
  get value() {
    return this.getAttribute('value');
  }

  set value(value) {
    this._reflectAttribute('value', value);
    this.trigger('coral-button:_valuechanged');
  }

  /**
   Expands the button to the full width of the parent.

   @type {Boolean}
   @default false
   @htmlattribute block
   @htmlattributereflected
   */
  get block() {
    return this._block || false;
  }

  set block(value) {
    const self = this;
    value = transform.booleanAttr(value);

    self._updateProperty('_block', value, function(value) {
      self._reflectAttribute('block', value);
      self.classList.toggle(`${CLASSNAME}--block`, value);
    });
  }

  /**
   The button's variant. See {@link ButtonVariantEnum}.

   @type {String}
   @default ButtonVariantEnum.DEFAULT
   @htmlattribute variant
   @htmlattributereflected
   */
  get variant() {
    return this._variant || variant.DEFAULT;
  }

  set variant(value) {
    const self = this;

    value = transform.toLowerCase(value);
    value = validate.enumeration(variant)(value) && value || variant.DEFAULT;

    self._updateProperty('_variant', value, function(value) {
      const classList = self.classList;

      self._reflectAttribute('variant', value);
      // removes every existing variant
      classList.remove(CLASSNAME, ACTION_CLASSNAME);
      classList.remove(...ALL_VARIANT_CLASSES);

      if (value === variant._CUSTOM) {
        classList.remove(CLASSNAME);
      } else {
        classList.add(...VARIANT_MAP[value]);

        if (value === variant.ACTION || value === variant.QUIET_ACTION) {
          classList.remove(CLASSNAME);
        }
      }
      // Update label styles
      self._updateLabel();
    });
  }

  /**
   Inherited from {@link BaseComponent#trackingElement}.
   */
  get trackingElement() {
    const self = this;
    return typeof self._trackingElement === 'undefined' ?
      // keep spaces to only 1 max and trim. this mimics native html behaviors
      (self.label || self).textContent.replace(/\s{2,}/g, ' ').trim() || self.icon :
      self._trackingElement;
  }

  set trackingElement(value) {
    super.trackingElement = value;
  }

  _onClick(event) {
    const self = this;
    if (!self.disabled) {
      self._trackEvent('click', self.getAttribute('is'), event);
    }
  }

  /** @ignore */
  _updateIcon(value) {
    const self = this;
    if (!self._updatedIcon && self._elements.icon) {
      return;
    }

    self._updatedIcon = true;

    const iconSizeValue = self.iconSize;
    const iconAutoAriaLabelValue = self.iconAutoAriaLabel;
    const iconElement = self._getIconElement();
    iconElement.icon = value;
    // Update size as well
    iconElement.size = iconSizeValue;
    // Update autoAriaLabel as well
    iconElement.autoAriaLabel = iconAutoAriaLabelValue;

    // removes the icon element from the DOM.
    if (self.icon === '') {
      iconElement.remove();
    }
    // add or adjust the icon. Add it back since it was blown away by textContent
    else if (!iconElement.parentNode || self._iconPosition) {
      if (self.contains(self.label)) {
        // insertBefore with <code>null</code> appends
        self.insertBefore(iconElement, self.iconPosition === iconPosition.LEFT ? self.label : self.label.nextElementSibling);
      }
    }

    super._toggleIconAriaHidden();
  }

  /** @ignore */
  _getIconElement() {
    let elements = this._elements;
    if (!elements.icon) {
      elements.icon = new Icon();
      elements.icon.size = self.iconSize;
    }
    return elements.icon;
  }

  /**
   Forces button to receive focus on mousedown
   @param {MouseEvent} event mousedown event
   @ignore
   */
  _onMouseDown(event) {
    const target = event.matchedTarget;

    // Wait a frame or button won't receive focus in Safari.
    window.requestAnimationFrame(() => {
      if (target !== document.activeElement) {
        target.focus();
      }
    });
  }

  _updateLabel(label) {
    label = label || self._elements.label;
    const self = this;
    const _variant = self._variant;
    const classList = label.classList;

    classList.remove(`${CLASSNAME}-label`, `${ACTION_CLASSNAME}-label`);

    if (_variant !== variant._CUSTOM) {
      if (_variant === variant.ACTION || _variant === variant.QUIET_ACTION) {
        classList.add(`${ACTION_CLASSNAME}-label`);
      } else {
        classList.add(`${CLASSNAME}-label`);
      }
    }
  }

  /** @private */
  get _contentZoneTagName() {
    return Object.keys(this._contentZones)[0];
  }

  get _contentZones() {
    return {'coral-button-label': 'label'};
  }

  /**
   Returns {@link BaseButton} sizes.

   @return {ButtonSizeEnum}
   */
  static get size() {
    return size;
  }

  /**
   Returns {@link BaseButton} variants.

   @return {ButtonVariantEnum}
   */
  static get variant() {
    return variant;
  }

  /**
   Returns {@link BaseButton} icon positions.

   @return {ButtonIconPositionEnum}
   */
  static get iconPosition() {
    return iconPosition;
  }

  /**
   Returns {@link BaseButton} icon sizes.

   @return {ButtonIconSizeEnum}
   */
  static get iconSize() {
    return iconSize;
  }

  static get _attributePropertyMap() {
    return commons.extend(super._attributePropertyMap, {
      iconposition: 'iconPosition',
      iconsize: 'iconSize',
      iconautoarialabel: 'iconAutoAriaLabel'
    });
  }

  /** @ignore */
  static get observedAttributes() {
    return super.observedAttributes.concat([
      'iconposition',
      'iconsize',
      'icon',
      'iconautoarialabel',
      'size',
      'selected',
      'block',
      'variant',
      'value'
    ]);
  }

  /** @ignore */
  render() {
    super.render();

    const self = this;
    // Default reflected attributes
    if (!self._variant) {
      self.variant = variant.DEFAULT;
    }
    if (!self._size) {
      self.size = size.MEDIUM;
    }

    // Create a fragment
    const fragment = document.createDocumentFragment();

    const label = self._elements.label;

    const contentZoneProvided = label.parentNode;

    // Remove it so we can process children
    if (contentZoneProvided) {
      self.removeChild(label);
    }

    let iconAdded = false;
    // Process remaining elements as necessary
    while (self.firstChild) {
      const child = self.firstChild;

      if (child.nodeName === 'CORAL-ICON') {
        // Don't add duplicated icons
        if (iconAdded) {
          self.removeChild(child);
        } else {
          // Conserve existing icon element to content
          self._elements.icon = child;
          fragment.appendChild(child);
          iconAdded = true;
        }
      }
      // Avoid content zone to be voracious
      else if (contentZoneProvided) {
        fragment.appendChild(child);
      } else {
        // Move anything else into the label
        label.appendChild(child);
      }
    }

    // Add the frag to the component
    self.appendChild(fragment);

    // Assign the content zones, moving them into place in the process
    self.label = label;

    // Make sure the icon is well positioned
    self._updatedIcon = true;
    self._updateIcon(self.icon);
  }

  /**
   Triggered when {@link BaseButton#selected} changed.

   @typedef {CustomEvent} coral-button:_selectedchanged

   @private
   */

  /**
   Triggered when {@link BaseButton#value} changed.

   @typedef {CustomEvent} coral-button:_valuechanged

   @private
   */
};

export default BaseButton;
