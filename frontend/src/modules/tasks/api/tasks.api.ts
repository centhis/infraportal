import { apiClient } from '@shared/api/api-client';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type { TaskExecution, WorkerHealth } from './tasks.dto';

export const tasksApi = {
    getWorkersHealth: async (): Promise<WorkerHealth> => {
        const { data } = await apiClient.get<WorkerHealth>(
            API_ENDPOINTS.TASKS.WORKER_HEALTH
        );
        return data;
    },

    runTask: async (
        taskName: string,
        params: Record<string, unknown>
    ): Promise<{ message: string; execution_id: string }> => {
        const { data } = await apiClient.post<{
            message: string;
            execution_id: string;
        }>(API_ENDPOINTS.TASKS.RUN(taskName), { params });
        return data;
    },

    getExecution: async (executionId: string): Promise<TaskExecution> => {
        const { data } = await apiClient.get<TaskExecution>(
            API_ENDPOINTS.TASKS.EXECUTION(executionId)
        );
        return data;
    },
};
