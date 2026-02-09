import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { ExecutionStatus } from '../../api/tasks.dto';

export function useRunTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            taskName,
            params,
        }: {
            taskName: string;
            params: Record<string, unknown>;
        }) => tasksApi.runTask(taskName, params),
        onSuccess: () => {
            // Invalidate tasks list or executions list if we had one
            queryClient.invalidateQueries({ queryKey: ['taskExecutions'] });
        },
    });
}

export function useTaskExecution(executionId: string | null) {
    return useQuery({
        queryKey: ['taskExecution', executionId],
        queryFn: () => tasksApi.getExecution(executionId!),
        enabled: !!executionId,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (!data) return 1000;
            if (
                data.status === ExecutionStatus.SUCCESS ||
                data.status === ExecutionStatus.FAILURE ||
                data.status === ExecutionStatus.REVOKED
            ) {
                return false;
            }
            return 1000;
        },
    });
}
