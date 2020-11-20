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

import {BaseComponent} from '../../../coral-base-component';
import {commons, transform, validate} from '../../../coral-utils';
import '../../../coral-component-wait';
import '../../../coral-component-button';
import '../../../coral-component-popover';
import '../../../coral-component-switch';
import '../../../coral-component-buttongroup';
import base from '../templates/base';

// Import external dependencies including JS and CSS
import rawinflate from 'deflate-js/lib/rawinflate';
import rawdeflate from 'deflate-js/lib/rawdeflate';
import 'codemirror/lib/codemirror.css';
import CodeMirror from 'codemirror';
import 'codemirror/mode/xml/xml';

// Base classname
const CLASS_NAME = '_coral-Playground';
const CORAL_NAME = 'Coral.Component.Playground';

/**
 Enumeration for {@link Playground} screens.
 
 @typedef {Object} PlaygroundScreenEnum
 
 @property {String} FULLSCREEN
 Editor covers the whole screen.
 @property {String} HORIZONTAL
 Split editor/preview horizontally.
 @property {String} VERTICAL
 Split editor/preview vertically.
 */
const SCREEN_ENUM = {
  FULLSCREEN: 'fullscreen',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical'
};
const PROPERTIES = ['livereload', 'screen', 'code'];

// builds an array containing all possible variant classnames. this will be used to remove classnames when the variant
// changes
const SCREEN_CLASSES = [];
for (const value in SCREEN_ENUM) {
  SCREEN_CLASSES.push(`${CLASS_NAME}--${SCREEN_ENUM[value]}`);
}

const CODEMIRROR_CONFIG = {
  mode: 'text/xml',
  lineNumbers: true,
  matchBrackets: true,
  indentWithTabs: true,
  tabSize: 2,
  indentUnit: 2
};

const DEBOUNCE_TIME = 250;

/**
 @class Coral.Playground
 @classdesc A Playground component with JS/CSS/HTML editor and live preview. Sharing code is possible by copy pasting
 the URL
 @htmltag coral-playground
 @extends {HTMLElement}
 @extends {BaseComponent}
 */
class Playground extends BaseComponent(HTMLElement) {
  /**
   Takes an optional configuration object for initialization.
   
   @param {?Object} config
   */
  constructor(config = {}) {
    super();
    
    this._config = config;
    
    // Template
    this._elements = {};
    base.call(this._elements, {commons});
    
    const overlayId = this._elements.overlay.id;
  
    // Events
    const events = {
      'click [handle="share"]': '_onShareClick',
      'click [handle="run"]': '_onRunClick'
    };
  
    // Overlay
    events[`global:capture:change #${overlayId} [handle="livereload"]`] = '_onLiveReloadChange';
    events[`global:capture:change #${overlayId} [handle="screen"]`] = '_onScreenChange';
  
    this._delegateEvents(events);
    
    // Init editor
    this._editor = new CodeMirror(this._elements.editor, CODEMIRROR_CONFIG);
  
    // Bind editor
    this._editor.on('change', () => {
      if (this.livereload) {
        this._debounceTrigger('coral-playground:coderun');
      }
      else {
        this._elements.run.style.visibility = 'visible';
      }
    });
  
    this._elements.frame.onload = () => {
      this._elements.loading.hidden = true;
  
      this.trigger('coral-playground:load');
    };
  }
  
  /**
   Whether the preview is updated automatically on code change.
   
   @type {Boolean}
   @default false
   @htmlattribute livereload
   */
  get livereload() {
    return this._livereload;
  }
  set livereload(value) {
    if (value) {
      this._livereload = true;
      this._elements.livereload.setAttribute('checked', '');
      this._elements.run.style.visibility = 'hidden';
  
      this._debounceTrigger('coral-playground:coderun');
    }
    else {
      this._livereload = false;
      this._elements.livereload.removeAttribute('checked');
      this._elements.run.style.visibility = 'visible';
    }
  
    this._debounceTrigger('coral-playground:settingschange');
  }
  
  /**
   The playground screen see {@link PlaygroundScreenEnum}.
   
   @type {String}
   @default PlaygroundScreenEnum.SPLIT_VERTICAL
   @htmlattribute screen
   */
  get screen() {
    return this._screen;
  }
  set screen(value) {
    value = transform.string(value).toLowerCase();
    this._screen = validate.enumeration(SCREEN_ENUM)(value) && value || SCREEN_ENUM.VERTICAL;
    this._reflectAttribute('screen', this._screen);
    
    this._elements.screen.value = this._screen;
    
    this.classList.remove(...SCREEN_CLASSES);
    this.classList.add(`${CLASS_NAME}--${this._screen}`);
    
    this._elements.overlay.reposition();
    
    this._debounceTrigger('coral-playground:settingschange');
  }
  
  /**
   The editor code.
   
   @type {String}
   */
  get code() {
    return this._editor.getValue();
  }
  set code(value) {
    this._editor.setValue(value || '');
  }
  
  _debounceTrigger(event) {
    // Debounce
    if (this._timeout !== null) {
      window.clearTimeout(this._timeout);
    }
    this._timeout = window.setTimeout(() => {
      this._timeout = null;
      this.trigger(event);
    }, DEBOUNCE_TIME);
  }
  
  _onRunClick() {
    this._debounceTrigger('coral-playground:coderun');
  }
  
  _onShareClick() {
    this._elements.copy.value = location.href;
    this._elements.copy.select();
    document.execCommand('copy');
  
    this._elements.sharetip.open = true;
    window.setTimeout(() => {
      this._elements.sharetip.open = false;
    }, 1000);
  }
  
  _onLiveReloadChange(event) {
    this.livereload = event.matchedTarget.checked;
  }
  
  _onScreenChange(event) {
    this.screen = event.matchedTarget.value;
  }
  
  static _parseQueryString(query) {
    const objURL = {};
    
    query.replace(
      new RegExp('([^?=&]+)(=([^&]*))?', 'g'),
      // eslint-disable-next-line no-unused-vars
      ($0, $1, $2, $3) => {
        objURL[$1] = decodeURI($3);
      }
    );
    return objURL;
  }
  
  static _compress(code) {
    const bytes = Array.prototype.map.call(code, char => char.charCodeAt(0));
    const compressed = rawdeflate(bytes);
    return window.btoa(compressed);
  }
  
  static _uncompress(base64) {
    const bytes = window.atob(base64);
    const uncompressed = rawinflate(bytes.split(','));
    return Array.prototype.map.call(uncompressed, byte => String.fromCharCode(byte)).join('');
  }
  
  /**
   Reads a query hash and returns a configuration that can be consumed by a {@link Playground} instance.
 
   @param {String} query
   @return {Object}
   */
  static read(query) {
    const params = Playground._parseQueryString(query);
    const config = {};
    
    if (Object.keys(params).length) {
      PROPERTIES.forEach((property) => {
        config[property] = property === 'code' && params[property] ? Playground._uncompress(params[property]) : params[property];
      });
    }
    
    return config;
  }
  
  /**
   Runs the code.
 
   @param {String} code
   */
  run(code) {
    this._elements.loading.hidden = false;
    this._elements.frame.srcdoc = code;
  }
  
  /**
   Returns the query hash for sharing.
   
   @return {String}
   */
  share() {
    let query = '?';
    
    PROPERTIES.forEach((property) => {
      if (this[property]) {
        query += `${property}=${(property === 'code' ? Playground._compress(this.code) : this[property])}&`;
      }
    });
    
    return query;
  }
  
  /**
   Returns {@link Playground} screens.
   
   @return {PlaygroundScreenEnum}
   */
  static get screen() {
    return SCREEN_ENUM;
  }
  
  /** @ignore */
  static get observedAttributes() {
    return super.observedAttributes.concat(['livereload', 'screen']);
  }
  
  /** @ignore */
  connectedCallback() {
    this.classList.add(CLASS_NAME);
    this.appendChild(this._elements.wrapper);
  
    // Set properties and defaults
    this.screen = this._config.screen;
    this.code = this._config.code;
    this.livereload = this._config.livereload;
  
    commons.addCallbackInRequestAnimationFrameQueue(() => {
      this._editor.refresh();
    
      if (this.livereload) {
        this._debounceTrigger('coral-playground:coderun');
      }
    }, this, CORAL_NAME + ".connectedCallback" + ".0");
  }
}

export default Playground;
