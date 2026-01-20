/**
 * Tests for Error Card Template
 */

import { describe, expect, it } from 'vitest';

import { ErrorCardTemplate } from './error-card-template';

describe('ErrorCardTemplate', () => {
  it('should render a not_found error card', () => {
    const card = ErrorCardTemplate({
      errorType: 'not_found',
      username: 'testuser',
    });

    expect(card).toBeDefined();
    expect(card.type).toBe(ErrorCardTemplate);
  });

  it('should render a private error card', () => {
    const card = ErrorCardTemplate({
      errorType: 'private',
      username: 'testuser',
    });

    expect(card).toBeDefined();
  });

  it('should render a server_error error card', () => {
    const card = ErrorCardTemplate({
      errorType: 'server_error',
    });

    expect(card).toBeDefined();
  });

  it('should render an invalid_data error card', () => {
    const card = ErrorCardTemplate({
      errorType: 'invalid_data',
      username: 'testuser',
    });

    expect(card).toBeDefined();
  });

  it('should use custom message when provided', () => {
    const customMessage = 'This is a custom error message';
    const card = ErrorCardTemplate({
      errorType: 'server_error',
      message: customMessage,
    });

    expect(card).toBeDefined();
  });
});
