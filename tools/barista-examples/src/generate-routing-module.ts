/**
 * @license
 * Copyright 2019 Dynatrace LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BaristaExampleMetadata } from './metadata';
import { join, basename } from 'path';

import {
  transformAndWriteTemplate,
  generateExampleImportStatements,
} from './util';
import { EXAMPLES_ROOT } from './main';

/** Generates the routing module including all routes (one for every example). */
export async function generateExamplesRoutingModule(
  examplesMetadata: BaristaExampleMetadata[],
): Promise<string> {
  const templateFile = join(EXAMPLES_ROOT, 'app-routing.module.template');
  const moduleFile = join(EXAMPLES_ROOT, 'app-routing.module.ts');

  return transformAndWriteTemplate(
    source => {
      const imports = generateExampleImportStatements(examplesMetadata);
      source = source.replace('${imports}', imports);

      const routes = examplesMetadata
        .map(metadata => {
          const fileName = basename(metadata.tsFileLocation).slice(0, -3);
          return `  { path: '${fileName}', component: ${metadata.className} }`;
        })
        .join(',\n');
      source = source.replace('${routes}', routes);

      return source;
    },
    templateFile,
    moduleFile,
  );
}