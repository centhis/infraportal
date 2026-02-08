import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { usersApi } from './users.api';
import { apiClient } from '@shared/api';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';

// Мокаем apiClient
vi.mock('@shared/api', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

describe('usersApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('update', () => {
        it('should transform groups to group_ids in payload', async () => {
            const userId = 123;
            // Определение типа ожидает groups как number[], но API нужен group_ids.
            // DTO UserUpdate обычно имеет group_ids, но UI может модифицировать его или legacy код передавал groups.
            // Имитируем то, что обрабатывает код: если 'groups' в payload.
            const data: Record<string, unknown> = {
                name: 'Updated Name',
                groups: [1, 2, 3],
            };

            const mockResponse = { data: { id: userId, ...data } };
            (apiClient.put as Mock).mockResolvedValue(mockResponse);

            await usersApi.update(userId, data);

            expect(apiClient.put).toHaveBeenCalledWith(
                `${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${userId}`,
                expect.objectContaining({
                    name: 'Updated Name',
                    group_ids: [1, 2, 3],
                })
            );

            // Должны проверить, что 'groups' удалён из payload, чтобы избежать ошибки API если он строгий
            const callArgs = (apiClient.put as Mock).mock.calls[0];
            if (!callArgs) throw new Error('No calls to apiClient.put');
            const payload = callArgs[1];
            expect(payload).not.toHaveProperty('groups');
        });

        it('should send other fields as is', async () => {
            const userId = 1;
            const data = { name: 'Simple Update', is_active: false };
            (apiClient.put as Mock).mockResolvedValue({ data: { id: userId, ...data } });

            await usersApi.update(userId, data);

            expect(apiClient.put).toHaveBeenCalledWith(
                `${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${userId}`,
                data
            );
        });
    });
});
