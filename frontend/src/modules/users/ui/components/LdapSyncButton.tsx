import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import SyncIcon from '@mui/icons-material/Sync';
import { useQuery } from '@tanstack/react-query';

import { usePermissions } from '@core/auth';
import { useToast } from '@core/providers/ToastProvider';
import { useLdapEnabled } from '../../../settings/ui/hooks/useLdapSettings';
import { tasksApi } from '../../../tasks/api/tasks.api';

export const LdapSyncButton: React.FC = () => {
    const { t } = useTranslation('user_management');
    const { showSuccess, showError } = useToast();
    const { can } = usePermissions();
    const { data: isLdapEnabled, isLoading: isLdapCheckLoading } = useLdapEnabled();

    // State to track the initial API call to start the task
    const [isStarting, setIsStarting] = useState(false);
    // State to track the current execution ID being polled
    const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

    // Poll the execution status if we have an ID
    const { data: execution } = useQuery({
        queryKey: ['task-execution', currentExecutionId],
        queryFn: () => tasksApi.getExecution(currentExecutionId!),
        enabled: !!currentExecutionId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status && ['SUCCESS', 'FAILURE', 'REVOKED'].includes(status)) {
                return false; // Stop polling on terminal states
            }
            return 1000; // Poll every 1s
        },
        refetchOnWindowFocus: false
    });

    // Handle task completion
    // Handle task completion
    useEffect(() => {
        if (currentExecutionId && execution?.status) {
            if (execution.status === 'SUCCESS') {
                showSuccess(t('user_management.ldap_sync.success_finished'));
                setCurrentExecutionId(null);
            } else if (execution.status === 'FAILURE' || execution.status === 'REVOKED') {
                let errorMsg = t('user_management.ldap_sync.error_failed_execution');

                // Try to extract specific error message from worker result
                if (execution.result) {
                    const resultData = execution.result as any;
                    // If result is object with 'error' key
                    if (typeof resultData === 'object' && resultData !== null && resultData.error) {
                        errorMsg = `${errorMsg}: ${resultData.error}`;
                    }
                    // If result behaves like string
                    else if (typeof resultData === 'string') {
                        errorMsg = `${errorMsg}: ${resultData}`;
                    }
                }

                if (execution.traceback) {
                    console.error("Task failure traceback:", execution.traceback);
                }
                showError(errorMsg);
                setCurrentExecutionId(null);
            }
        }
    }, [execution, currentExecutionId, showSuccess, showError, t]);

    // Can only sync if LDAP is enabled and user has update permissions
    const canSync = isLdapEnabled && can('users:update');

    // UI is busy if we are starting the request OR if the task is running
    const isBusy = isStarting || !!currentExecutionId;

    const handleSync = async () => {
        if (isBusy) return;

        setIsStarting(true);
        try {
            const response = await tasksApi.runTask('users:sync_ldap', {});
            // Notify that request was accepted
            showSuccess(t('user_management.ldap_sync.success_started'));
            // Start polling
            setCurrentExecutionId(response.execution_id);
        } catch (error) {
            console.error('LDAP Sync failed to start:', error);
            showError(t('user_management.ldap_sync.error_failed'));
        } finally {
            setIsStarting(false);
        }
    };

    if (isLdapCheckLoading) {
        return null; // Don't show anything while checking status
    }

    if (!isLdapEnabled) {
        return null; // Don't show if LDAP is disabled
    }

    return (
        <Button
            variant="outlined"
            color="primary"
            size="medium"
            startIcon={isBusy ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            onClick={handleSync}
            disabled={!canSync || isBusy}
            title={!canSync ? t('user_management.ldap_sync.no_permission') : ''}
            sx={{
                textTransform: 'none',
                borderColor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.5)',
                '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.04)'
                }
            }}
        >
            {isBusy
                ? t('user_management.ldap_sync.syncing')
                : t('user_management.ldap_sync.button')}
        </Button>
    );
};
