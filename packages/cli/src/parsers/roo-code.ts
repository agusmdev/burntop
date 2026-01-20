/**
 * Roo Code Parser
 *
 * Parses usage data from Roo Code VS Code extension (fork of Cline).
 *
 * Extension ID: rooveterinaryinc.roo-cline
 * Storage: ~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/
 *
 * @see https://github.com/RooCodeInc/Roo-Code
 */

import { ClineBaseParser } from './cline-base.js';

export class RooCodeParser extends ClineBaseParser {
  readonly name = 'roo-code';
  readonly displayName = 'Roo Code';
  readonly extensionId = 'rooveterinaryinc.roo-cline';
}
