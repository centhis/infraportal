// src/setupTests.js
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server.js';
import { resetUsers, resetRoles, resetPermissions } from './mocks/handlers.js';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// and clear localStorage to prevent state leakage.
afterEach(() => {
    server.resetHandlers();
    resetUsers();
    resetRoles();
    resetPermissions();
    localStorage.clear();
});

// Clean up after the tests are finished.
afterAll(() => server.close());
