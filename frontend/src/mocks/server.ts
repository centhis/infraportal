import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Настраивает сервер для мокинга запросов с заданными обработчиками.
export const server = setupServer(...handlers);
