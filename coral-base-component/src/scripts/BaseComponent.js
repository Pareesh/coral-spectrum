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

import Vent from '@adobe/vent';
import {commons, Keys, keys, events, transform, validate, tracking as trackingUtil} from '../../../coral-utils';

// Used to split events by type/target
const delegateEventSplitter = /^(\S+)\s*(.*)$/;

/**
 Enumeration representing the tracking options.

 @typedef {Object} TrackingEnum

 @property {String} ON
 Enables tracking of the component interactions.
 @property {String} OFF
 Disables tracking of the component interactions.
 */
const tracking = {
  ON: 'on',
  OFF: 'off'
};

/**
 Return the method corresponding to the method name or the function, if passed.
 @ignore
 */
const getListenerFromMethodNameOrFunction = function (obj, eventName, methodNameOrFunction) {
  // Try to get the method
  if (typeof methodNameOrFunction === 'function') {
    return methodNameOrFunction;
  } else if (typeof methodNameOrFunction === 'string') {
    if (!obj[methodNameOrFunction]) {
      throw new Error(`Coral.Component: Unable to add ${eventName} listener for ${obj.toString()}, method
      ${methodNameOrFunction} not found`);
    }

    const listener = obj[methodNameOrFunction];

    if (typeof listener !== 'function') {
      throw new Error(`Coral.Component: Unable to add ${eventName} listener for ${obj.toString()}, listener is a
      ${(typeof listener)} but should be a function`);
    }

    return listener;
  } else if (methodNameOrFunction) {
    // If we're passed something that's truthy (like an object), but it's not a valid method name or a function, get
    // angry
    throw new Error(`Coral.Component: Unable to add ${eventName} listener for ${obj.toString()}, ${methodNameOrFunction}
    is neither a method name or a function`);
  }

  return null;
};

/**
 Add local event and key combo listeners for this component, store global event/key combo listeners for later.
 @ignore
 */
const delegateEvents = function () {
  /*
   Add listeners to new event
   - Include in hash
   Add listeners to existing event
   - Override method and use super
   Remove existing event
   - Pass null
   */
  let match;
  let eventName;
  let eventInfo;
  let listener;
  let selector;
  let elements;
  let isGlobal;
  let isKey;
  let isResize;
  let isCapture;
  const self = this;
  const events = self._events;

  for (eventInfo in events) {
    listener = events[eventInfo];

    // Extract the event name and the selector
    match = eventInfo.match(delegateEventSplitter);
    eventName = `${match[1]}.CoralComponent`;
    selector = match[2];

    if (selector === '') {
      // instead of null because the key module checks for undefined
      selector = undefined;
    }

    // Try to get the method corresponding to the value in the map
    listener = getListenerFromMethodNameOrFunction(self, eventName, listener);

    if (listener) {
      // Always execute in the context of the object
      // @todo is this necessary? this should be correct anyway
      listener = listener.bind(self);

      // Check if the listener is on the window
      isGlobal = eventName.indexOf('global:') === 0;
      if (isGlobal) {
        eventName = eventName.substr(7);
      }

      // Check if the listener is a capture listener
      isCapture = eventName.indexOf('capture:') === 0;
      if (isCapture) {
        // @todo Limitation: It should be possible to do capture:global:, but it isn't
        eventName = eventName.substr(8);
      }

      // Check if the listener is a key listener
      isKey = eventName.indexOf('key:') === 0;
      if (isKey) {
        if (isCapture) {
          throw new Error('Coral.Keys does not currently support listening to key events with capture');
        }
        eventName = eventName.substr(4);
      }

      // Check if the listener is a resize listener
      isResize = eventName.indexOf('resize') === 0;
      if (isResize) {
        if (isCapture) {
          throw new Error('Coral.commons.addResizeListener does not currently support listening to resize event with capture');
        }
      }

      if (isGlobal) {
        // Store for adding/removal
        if (isKey) {
          self._globalKeys = self._globalKeys || [];
          self._globalKeys.push({
            keyCombo: eventName,
            selector: selector,
            listener: listener
          });
        } else {
          self._globalEvents = self._globalEvents || [];
          self._globalEvents.push({eventName, selector, listener, isCapture});
        }
      }
      // Events on the element itself
      else if (isKey) {
        // Create the keys instance only if its needed
        self._keys = self._keys || new Keys(self, {
          // The filter function for keyboard events.
          filter: self._filterKeys,
          // Execute key listeners in the context of the element
          context: self
        });

        // Add listener locally
        this._keys.on(eventName, selector, listener);
      } else if (isResize) {
        if (selector) {
          elements = document.querySelectorAll(selector);
          for (let i = 0 ; i < elements.length ; ++i) {
            commons.addResizeListener(elements[i], listener);
          }
        } else {
          commons.addResizeListener(self, listener);
        }
      } else {
        self._vent.on(eventName, selector, listener, isCapture);
      }
    }
  }
};

/**
 Attach global event listeners for this component.
 @ignore
 */
const delegateGlobalEvents = function () {
  let i;
  const self = this;
  const globalEvents = self._globalEvents;
  const globalKeys = self._globalKeys;
  const keys = self._keys;

  if (globalEvents) {
    // Remove global event listeners
    for (i = 0 ; i < globalEvents.length ; i++) {
      const event = globalEvents[i];
      events.on(event.eventName, event.selector, event.listener, event.isCapture);
    }
  }

  if (globalKeys) {
    // Remove global key listeners
    for (i = 0 ; i < globalKeys.length ; i++) {
      const key = globalKeys[i];
      keys.on(key.keyCombo, key.selector, key.listener);
    }
  }

  if (keys) {
    keys.init(true);
  }
};

/**
 Remove global event listeners for this component.
 @ignore
 */
const undelegateGlobalEvents = function () {
  let i;
  const self = this;
  const globalEvents = self._globalEvents;
  const globalKeys = self._globalKeys;
  const keys = self._keys;

  if (globalEvents) {
    // Remove global event listeners
    for (i = 0 ; i < globalEvents.length ; i++) {
      const event = globalEvents[i];
      events.off(event.eventName, event.selector, event.listener, event.isCapture);
    }
  }

  if (globalKeys) {
    // Remove global key listeners
    for (i = 0 ; i < globalKeys.length ; i++) {
      const key = globalKeys[i];
      keys.off(key.keyCombo, key.selector, key.listener);
    }
  }

  if (keys) {
    keys.destroy(true);
  }
};

// Used to find upper case characters
const REG_EXP_UPPERCASE = /[A-Z]/g;

/**
 Returns the constructor namespace
 @ignore
 */
const getConstructorName = function (constructor) {
  // Will contain the namespace of the constructor in reversed order
  const constructorName = [];
  // Keep a reference on the passed constructor
  const originalConstructor = constructor;

  // Traverses Coral constructors if not already done to set the namespace
  if (!constructor._namespace) {
    // Set namespace on Coral constructors until 'constructor' is found
    const find = (obj, constructorToFind) => {
      let found = false;
      const type = typeof obj;

      if (obj && type === 'object' || type === 'function') {
        const subObj = Object.keys(obj);

        for (let i = 0 ; i < subObj.length ; i++) {
          const key = subObj[i];

          // Components are capitalized
          if (key[0].match(REG_EXP_UPPERCASE) !== null) {
            // Keep a reference of the constructor name and its parent
            obj[key]._namespace = {
              parent: obj,
              value: key
            };

            found = obj[key] === constructorToFind;

            if (found) {
              break;
            } else {
              found = find(obj[key], constructorToFind);
            }
          }
        }
      }

      return found;
    };

    // Look for the constructor in the Coral namespace
    find(window.Coral, constructor);
  }

  // Climb up the constructor namespace
  while (constructor) {
   const _namespace = constructor._namespace;
    if (_namespace) {
      constructorName.push(_namespace.value);
      constructor = _namespace.parent;
    } else {
      constructor = false;
    }
  }

  // Build the full namespace string and save it for reuse
  originalConstructor._componentName = constructorName.reverse().join('.');

  return originalConstructor._componentName;
};

/**
 @base BaseComponent
 @classdesc The base element for all Coral components
 */
const BaseComponent = (superClass) => class extends superClass {
  /** @ignore */
  constructor() {
    const self = this;
    super();
    // Attach Vent
    self._vent = new Vent(self);
    self._events = {};

    // Content zone MO for virtual DOM support
    if (self._contentZones) {
      self._contentZoneObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          for (let i = 0 ; i < mutation.addedNodes.length ; i++) {
            const addedNode = mutation.addedNodes[i];

            for (const name in self._contentZones) {
              const contentZone = self._contentZones[name];
              if (addedNode.nodeName.toLowerCase() === name && !addedNode._contentZoned) {
                // Insert the content zone at the right position
                /** @ignore */
                self[contentZone] = addedNode;
              }
            }
          }
        });
      });

      self._contentZoneObserver.observe(self, {
        childList: true,
        subtree: true
      });
    }
  }

  /**
   Tracking of events. This provides insight on the usage of the components. It accepts "ON" and "OFF". In order to
   successfully track the events, {Tracking} needs to be configured.

   @type {String}
   @default TrackingEnum.ON
   @htmlattribute tracking
   */
  get tracking() {
    return this._tracking || this.getAttribute('tracking') || tracking.ON;
  }

  set tracking(value) {
    value = transform.toLowerCase(value);
    this._tracking = validate.enumeration(tracking)(value) && value || tracking.ON;
  }

  /**
   The string representing the feature being tracked. This provides additional context to the analytics trackers
   about the feature that the element enables.

   @type {String}
   @default ""
   @htmlattribute trackingfeature
   */
  get trackingFeature() {
    return this._trackingFeature || this.getAttribute('trackingFeature') || '';
  }

  set trackingFeature(value) {
    this._trackingFeature = transform.string(value);
  }

  /**
   The string representing the element name being tracked. This providex additional context to the trackers about the
   element that was interacted with.

   @type {String}
   @default ""
   @htmlattribute trackingelement
   */
  get trackingElement() {
    return this._trackingElement || this.getAttribute('trackingElement') || '';
  }

  set trackingElement(value) {
    this._trackingElement = transform.string(value);
  }

  // Constructs and returns the component name based on the constructor
  get _componentName() {
    return this.constructor._componentName || getConstructorName(this.constructor);
  }

  // The filter function for keyboard events. By default, any child element can trigger keyboard events.
  // You can pass {@link Keys.filterInputs} to avoid listening to key events triggered from within
  // inputs.
  _filterKeys() {
    return true;
  }

  // Attach event listeners including global ones
  _delegateEvents(eventMap) {
    const self = this;
    self._events = commons.extend(self._events, eventMap);
    delegateEvents.call(self);
    delegateGlobalEvents.call(self);

    // Once events are attached, we dispose them
    self._events = {};
  }

  // Returns the content zone if the component is connected and contains the content zone else null
  // Ideally content zones will be replaced by shadow dom and <slot> elements
  _getContentZone(contentZone) {
    if (document.documentElement.contains(this)) {
      return this.contains(contentZone) && contentZone || null;
    }
    // Return the content zone by default
    return contentZone;
  }

  // Sets the value as content zone for the property given the specified options
  // Ideally content zones will be replaced by shadow dom and <slot> elements
  _setContentZone(property, value, options) {
    const self = this;
    const handle = options.handle;
    const expectedTagName = options.tagName;
    const additionalSetter = options.set;
    const insert = options.insert;
    const elements = self._elements;
    let oldNode;

    if (value) {
      if (!(value instanceof HTMLElement)) {
        throw new Error(`DOMException: Failed to set the "${property}" property on "${this.toString()}":
        The provided value is not of type "HTMLElement".`);
      }

      if (expectedTagName && value.tagName.toLowerCase() !== expectedTagName) {
        throw new Error(`DOMException: Failed to set the "${property}" property on "${this.toString()}": The new
        ${property} element is of type "${value.tagName}". It must be a "${expectedTagName.toUpperCase()}" element.`);
      }

      oldNode = elements[handle];

      // Flag it for the content zone MO
      value._contentZoned = true;

      // Replace the existing element
      if (insert) {
        // Remove old node
        if (oldNode && oldNode.parentNode) {
          oldNode.parentNode.removeChild(oldNode);
        }
        // Insert new node
        insert.call(self, value);
      } else if (oldNode && oldNode.parentNode) {
        commons._log('warn', `${self._componentName} does not define an insert method for content zone ${handle}, falling back to replace.`);
        // Old way -- assume we have an old node
        elements[handle].parentNode.replaceChild(value, elements[handle]);
      } else {
        commons._log('error', `${this._componentName} does not define an insert method for content zone ${handle}, falling back to append.`);
        // Just append, which may introduce bugs, but at least doesn't crazy
        this.appendChild(value);
      }
    } else {
      // we need to remove the content zone if it exists
      oldNode = elements[handle];
      if (oldNode && oldNode.parentNode) {
        oldNode.parentNode.removeChild(oldNode);
      }
    }

    // Re-assign the handle to the new element
    elements[handle] = value;

    // Invoke the setter
    if (typeof additionalSetter === 'function') {
      additionalSetter.call(self, value);
    }
  }

  /**
   Update the property of the element and execute the passed callback.
   Only when the existing value is changed then property value will be updated
   and callback will be executed.This is generally used to update the coral internal mapped property.

   @param {String} handle the property of element.
   @param {*} value to which element value needs to be updated
   @param {function} callback function to be executed if value gets changed.
   */
  _updateProperty(handle, value, callback) {
    const self = this;
    if(!handle && typeof handle !== 'string') {
      throw new Error(`Coral.Component._updateProperty: handle should be a valid string`);
      return;
    }

    if(validate.valueMustChange(self[handle], value)) {
      self[handle] = value;

      if(typeof callback === 'function') {
        callback.call(self, value);
      }
    }
  }

  // Handles the reflection of properties by using a flag to prevent setting the property by changing the attribute
  _reflectAttribute(attributeName, value) {
    const self = this;
    if (typeof value === 'boolean') {
      if (value && !self.hasAttribute(attributeName)) {
        self._reflectedAttribute = true;
        self.setAttribute(attributeName, '');
        self._reflectedAttribute = false;
      } else if (!value && self.hasAttribute(attributeName)) {
        self._reflectedAttribute = true;
        self.removeAttribute(attributeName);
        self._reflectedAttribute = false;
      }
    } else if (this.getAttribute(attributeName) !== String(value)) {
      self._reflectedAttribute = true;
      self.setAttribute(attributeName, value);
      self._reflectedAttribute = false;
    }
  }

  /**
   Notifies external listeners about an internal interaction. This method is used internally in every
   component's method that we want to track.

   @param {String} eventType The event type. Eg. click, select, etc.
   @param {String} targetType The element type being used. Eg. cyclebutton, cyclebuttonitem, etc.
   @param {CustomEvent} event
   @param {BaseComponent} childComponent - Optional, in case the event occurred on a child component.

   @returns {BaseComponent}
   */
  _trackEvent(eventType, targetType, event, childComponent) {
    if (this.tracking === this.constructor.tracking.ON) {
      trackingUtil.track(eventType, targetType, event, this, childComponent);
    }
    return this;
  }

  /**
   Returns the component name.

   @return {String}
   */
  toString() {
    return `Coral.${this._componentName}`;
  }

  /**
   Add an event listener.

   @param {String} eventName
   The event name to listen for.
   @param {String} [selector]
   The selector to use for event delegation.
   @param {Function} func
   The function that will be called when the event is triggered.
   @param {Boolean} [useCapture=false]
   Whether or not to listen during the capturing or bubbling phase.
   @returns {BaseComponent} this, chainable.
   */
  on(eventName, selector, func, useCapture) {
    this._vent.on(eventName, selector, func, useCapture);
    return this;
  }

  /**
   Remove an event listener.

   @param {String} eventName
   The event name to stop listening for.
   @param {String} [selector]
   The selector that was used for event delegation.
   @param {Function} func
   The function that was passed to <code>on()</code>.
   @param {Boolean} [useCapture]
   Only remove listeners with <code>useCapture</code> set to the value passed in.
   @returns {BaseComponent} this, chainable.
   */
  off(eventName, selector, func, useCapture) {
    this._vent.off(eventName, selector, func, useCapture);
    return this;
  }

  /**
   Trigger an event.

   @param {String} eventName
   The event name to trigger.
   @param {Object} [props]
   Additional properties to make available to handlers as <code>event.detail</code>.
   @param {Boolean} [bubbles=true]
   Set to <code>false</code> to prevent the event from bubbling.
   @param {Boolean} [cancelable=true]
   Set to <code>false</code> to prevent the event from being cancelable.
   @returns {CustomEvent} CustomEvent object
   */
  trigger(eventName, props, bubbles, cancelable) {
    // When 'bubbles' is not set, then default to true:
    bubbles = bubbles || bubbles === undefined;

    // When 'cancelable' is not set, then default to true:
    cancelable = cancelable || cancelable === undefined;

    const event = new CustomEvent(eventName, {
      bubbles: bubbles,
      cancelable: cancelable,
      detail: props
    });

    // Don't trigger the event if silenced
    if (this._silenced) {
      return event;
    }

    // default value in case the dispatching fails
    let defaultPrevented = false;

    try {
      // leads to NS_ERROR_UNEXPECTED in Firefox
      // https://bugzilla.mozilla.org/show_bug.cgi?id=329509
      defaultPrevented = !this.dispatchEvent(event);
    }
      // eslint-disable-next-line no-empty
    catch (e) {
    }

    // Check if the defaultPrevented status was correctly stored back to the event object
    if (defaultPrevented !== event.defaultPrevented) {
      // dispatchEvent() doesn't correctly set event.defaultPrevented in IE 9
      // However, it does return false if preventDefault() was called
      // Unfortunately, the returned event's defaultPrevented property is read-only
      // We need to work around this such that (patchedEvent instanceof Event) === true
      // First, we'll create an object that uses the event as its prototype
      // This gives us an object we can modify that is still technically an instanceof Event
      const patchedEvent = Object.create(event);

      // Next, we set the correct value for defaultPrevented on the new object
      // We cannot simply assign defaultPrevented, it causes a "Invalid Calling Object" error in IE 9
      // For some reason, defineProperty doesn't cause this
      Object.defineProperty(patchedEvent, 'defaultPrevented', {
        value: defaultPrevented
      });

      return patchedEvent;
    }

    return event;
  }

  /**
   Set multiple properties.

   @param {Object.<String, *>} properties
   An object of property/value pairs to set.
   @param {Boolean} silent
   If true, events should not be triggered as a result of this set.

   @returns {BaseComponent} this, chainable.
   */
  set(propertyOrProperties, valueOrSilent, silent) {
    let property;
    let properties;
    let value;
    const self = this;
    const isContentZone = (prop) => self._contentZones && commons.swapKeysAndValues(self._contentZones)[prop];

    const updateContentZone = (prop, val) => {
      // If content zone exists and we only want to update properties on the content zone
      if (self[prop] instanceof HTMLElement && !(val instanceof HTMLElement)) {
        for (const contentZoneProperty in val) {
          /** @ignore */
          self[prop][contentZoneProperty] = val[contentZoneProperty];
        }
      }
      // Else assign the new value to the content zone
      else {
        /** @ignore */
        self[prop] = val;
      }
    };

    const setProperty = (prop, val) => {
      if (isContentZone(prop)) {
        updateContentZone(prop, val);
      } else {
        self._silenced = silent;
        /** @ignore */
        self[prop] = val;
        self._silenced = false;
      }
    };

    if (typeof propertyOrProperties === 'string') {
      // Set a single property
      property = propertyOrProperties;
      value = valueOrSilent;

      setProperty(property, value);
    } else {
      properties = propertyOrProperties;
      silent = valueOrSilent;

      // Set a map of properties
      for (property in properties) {
        value = properties[property];

        setProperty(property, value);
      }
    }

    return self;
  }

  /**
   Get the value of a property.

   @param {String} property
   The name of the property to fetch the value of.
   @returns {*} Property value.
   */
  get(property) {
    return this[property];
  }

  /**
   Show this component.

   @returns {BaseComponent} this, chainable
   */
  show() {
    const self = this;
    if (!self.hidden) {
      return self;
    }

    /** @ignore */
    self.hidden = false;
    return self;
  }

  /**
   Hide this component.
   @returns {BaseComponent} this, chainable
   */
  hide() {
    const self = this;
    if (self.hidden) {
      return self;
    }

    /** @ignore */
    self.hidden = true;
    return self;
  }

  /**
   * checks whether connectedCallback needs to be executed or not ,skip if component is not in connected state
   * or connectedCallback already executed for the component or we are ignore the connectedCallback for some reason
   *
   * @returns {Boolean} return true for skipped cases
   */
  _skipConnectedCallback() {
    return !this.isConnected || this._disconnected === false || this._ignoreConnectedCallback === true;
  }

  /**
   Returns {@link BaseComponent} tracking options.

   @return {TrackingEnum}
   */
  static get tracking() {
    return tracking;
  }

  static get _attributePropertyMap() {
    return {
      trackingelement: 'trackingElement',
      trackingfeature: 'trackingFeature'
    };
  }

  /** @ignore */
  static get observedAttributes() {
    return [
      'tracking',
      'trackingelement',
      'trackingfeature',
      'trackingFeature'
    ];
  }

  /** @ignore */
  // eslint-disable-next-line no-unused-vars
  attributeChangedCallback(name, oldValue, value) {
    if (!this._reflectedAttribute) {
      // Use the attribute/property mapping
      this[this.constructor._attributePropertyMap[name] || name] = value;
    }
  }

  /** @ignore */
  connectedCallback() {
    const self = this;
    // A component that is reattached should respond to global events again
    if (self._disconnected) {
      delegateGlobalEvents.call(self);
    }
    self._disconnected = false;

    if (!self._rendered) {
      self.render();
    }
  }

  /** @ignore */
  render() {
    this._rendered = true;
  }

  /** @ignore */
  disconnectedCallback() {
    // A component that isn't in the DOM should not be responding to global events
    this._disconnected = true;
    undelegateGlobalEvents.call(this);
  }
};

export default BaseComponent;
