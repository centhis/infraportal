// src/setupTests.js
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './mocks/server.js';
import { resetUsers, resetRoles, resetPermissions } from './mocks/handlers.js';

// Establish API mocking before all tests.
beforeAll(() => {
    // Mock location
    Object.defineProperty(window, 'location', {
        value: {
            href: 'http://localhost:3000',
            replace: vi.fn(),
        },
        writable: true,
    });
    
    server.listen();
});

// Reset any request handlers that we may add during the tests,
// and clear localStorage to prevent state leakage.
afterEach(() => {
    server.resetHandlers();
    resetUsers();
    resetRoles();
    resetPermissions();
    // Use the mocked clear method
    window.localStorage.clear();
    // Clear all mocks for good measure
    vi.clearAllMocks();
    window.location.replace.mockClear();
    window.location.href = 'http://localhost:3000';
});

// Clean up after the tests are finished.
afterAll(() => server.close());
