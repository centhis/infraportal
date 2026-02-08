export interface WorkerStats {
    name: string;
    active_tasks: number;
    concurrency: number;
    queued_tasks: number;
    memory_usage: number; // KB
}

export interface WorkerHealth {
    active_workers: number;
    active_tasks: number;
    queued_tasks: number;
    status: string;
    workers: WorkerStats[];
}

export enum ExecutionStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    REVOKED = 'REVOKED',
}

export interface TaskExecution {
    id: string;
    task_type: string;
    status: ExecutionStatus;
    result?: Record<string, unknown>;
    traceback?: string;
    created_at: string;
    started_at?: string;
    finished_at?: string;
    triggered_by: string;
}
