// Basic tests for type definitions and setup verification

import * as fc from 'fast-check';
import {
  arbitraryUUID,
  arbitraryEmail,
  arbitraryMessage,
  arbitraryTextGenerationRequest,
  arbitraryUserInput,
} from '../test/generators';
import { isValidEmail, isValidUUID } from '../utils/validation';

describe('Type System Setup', () => {
  test('should export all core types', () => {
    // This test verifies that our type system compiles and exports work
    expect(typeof arbitraryUUID).toBe('function');
    expect(typeof arbitraryEmail).toBe('function');
    expect(typeof arbitraryMessage).toBe('function');
  });

  test('should have working utility functions', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);

    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('invalid-uuid')).toBe(false);
  });
});

describe('Property-Based Test Generators', () => {
  test('UUID generator produces valid UUIDs', () => {
    fc.assert(
      fc.property(arbitraryUUID(), (uuid) => {
        expect(uuid).toBeValidUUID();
      })
    );
  });

  test('Email generator produces valid emails', () => {
    fc.assert(
      fc.property(arbitraryEmail(), (email) => {
        expect(email).toBeValidEmail();
      })
    );
  });

  test('Message generator produces valid messages', () => {
    fc.assert(
      fc.property(arbitraryMessage(), (message) => {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('role');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('timestamp');
        expect(message.id).toBeValidUUID();
        expect(typeof message.content).toBe('string');
        expect(message.content.length).toBeGreaterThan(0);
        expect(message.timestamp).toBeInstanceOf(Date);
      })
    );
  });

  test('TextGenerationRequest generator produces valid requests', () => {
    fc.assert(
      fc.property(arbitraryTextGenerationRequest(), (request) => {
        expect(request).toHaveProperty('messages');
        expect(Array.isArray(request.messages)).toBe(true);
        expect(request.messages.length).toBeGreaterThan(0);

        if (request.temperature !== undefined) {
          expect(typeof request.temperature).toBe('number');
          expect(request.temperature).toBeGreaterThanOrEqual(0);
          expect(request.temperature).toBeLessThanOrEqual(2);
        }

        if (request.maxTokens !== undefined) {
          expect(typeof request.maxTokens).toBe('number');
          expect(request.maxTokens).toBeGreaterThan(0);
        }
      })
    );
  });

  test('UserInput generator produces valid user inputs', () => {
    fc.assert(
      fc.property(arbitraryUserInput(), (input) => {
        expect(input).toHaveProperty('content');
        expect(input).toHaveProperty('userId');
        expect(input).toHaveProperty('sessionId');
        expect(input).toHaveProperty('timestamp');

        expect(typeof input.content).toBe('string');
        expect(input.content.length).toBeGreaterThan(0);
        expect(input.userId).toBeValidUUID();
        expect(input.sessionId).toBeValidUUID();
        expect(input.timestamp).toBeInstanceOf(Date);
      })
    );
  });
});
