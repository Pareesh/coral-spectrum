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

/**
 Collection capable of handling non-nested items with a selected attribute. It is useful to manage the
 internal state of selection. It currently does not support options.filter for the selection related functions.
 */
import {transform} from '../../../coral-utils';

/**
 Selector used to determine if nested items should be allowed.

 @private
 */
const SCOPE_SELECTOR = ':scope > ';

/**
 Attribute used to identify the items of a collection.

 @private
 */
const COLLECTION_ID = 'coral-collection-id-';

class LazyCollection {
  constructor() {
    this._initialised = false;
  }

  _initialise() {
    if(this._container && !this._container._initialised && this._container._initialise) {
      // initialise container if not
      this._container._initialise();
    }

    if(!this._initialised) {
      // we provide support for the :scope selector and swap it for an id
      if (this._itemSelector && this._itemSelector.indexOf(SCOPE_SELECTOR) === 0) {
        this._container.id = this._container.id || COLLECTION_ID + this._id;
        // we create a special selector to make sure that the items are direct children of the container. given that
        // :scope is not fully supported by all browsers, we use an id to query
        this._allItemsSelector = this._itemSelector.replace(SCOPE_SELECTOR, `#${this._container.id} > `);

        // we remove the :scope from the selector to be able to use it to determine if the item matches the collection
        this._itemSelector = this._itemSelector.replace(SCOPE_SELECTOR, '');
        // in case they match, we enable this optimization
        if (this._itemSelector === this._itemTagName) {
          this._useItemTagName = this._itemSelector.toUpperCase();
        }
      }
      // live collections are not supported when nested items is used
      else {
        this._allItemsSelector = this._itemSelector;

        // live collections can only be used when a tagname is used to query the items
        if (this._container && this._allItemsSelector === this._itemTagName) {
          this._liveCollection = true;
          this._useItemTagName = this._allItemsSelector.toUpperCase();
        }
      }
      this._initialised = true;
    }
  }
}

export default LazyCollection;
