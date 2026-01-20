/**
 * Kilo Code Parser
 *
 * Parses usage data from Kilo Code VS Code extension (fork of Cline).
 *
 * Extension ID: kilocode.kilo-code
 * Storage: ~/Library/Application Support/Code/User/globalStorage/kilocode.kilo-code/
 *
 * @see https://github.com/Kilo-Org/kilocode
 */

import { ClineBaseParser } from './cline-base.js';

export class KiloCodeParser extends ClineBaseParser {
  readonly name = 'kilo-code';
  readonly displayName = 'Kilo Code';
  readonly extensionId = 'kilocode.kilo-code';
}
