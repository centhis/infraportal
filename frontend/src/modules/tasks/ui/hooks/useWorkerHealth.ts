import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';

export function useWorkerHealth() {
    return useQuery({
        queryKey: ['workerHealth'],
        queryFn: tasksApi.getWorkersHealth,
        refetchInterval: 30000,
    });
}
