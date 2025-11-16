// src/setupTests.js
import '@testing-library/jest-dom';
import { server } from './mocks/server.js';
import { resetUsers } from './mocks/handlers.js';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// and clear localStorage to prevent state leakage.
afterEach(() => {
    server.resetHandlers();
    resetUsers();
    localStorage.clear();
});

// Clean up after the tests are finished.
afterAll(() => server.close());
