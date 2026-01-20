/**
 * Cline Parser
 *
 * Parses usage data from Cline VS Code extension.
 *
 * Extension ID: saoudrizwan.claude-dev
 * Storage: ~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/
 *
 * @see https://github.com/cline/cline
 */

import { ClineBaseParser } from './cline-base.js';

export class ClineParser extends ClineBaseParser {
  readonly name = 'cline';
  readonly displayName = 'Cline';
  readonly extensionId = 'saoudrizwan.claude-dev';
}
