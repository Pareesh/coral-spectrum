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

module.exports = function (gulp) {
  const rollup = require('rollup').rollup;
  const rollupConfig = require('../configs/rollup.conf.js')();
  const rollupConfigES6 = require('../configs/rollup.conf.es6.js')();

  gulp.task('scripts', async function (done) {
    const bundle = await rollup({
      input: 'index.js',
      plugins: rollupConfig
    });

    await bundle.write({
      file: './dist/js/coral.js',
      format: 'iife',
      name: 'Coral',
      sourcemap: true
    });

    done();
  });

  gulp.task('scripts.es6', async function (done) {
    const bundle = await rollup({
      input: 'index.js',
      plugins: rollupConfigES6
    });

    await bundle.write({
      file: './dist/js/coral.es6.js',
      format: 'iife',
      name: 'Coral',
      sourcemap: true
    });

    done();
  });
};
