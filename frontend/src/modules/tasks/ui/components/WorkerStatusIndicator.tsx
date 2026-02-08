import React from 'react';
import { IconButton, Tooltip, Box, Typography, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWorkerHealth } from '../../ui/hooks/useWorkerHealth';

const StatusLight: React.FC<{ isHealthy?: boolean; count?: number; pulse?: boolean }> = ({ isHealthy, count, pulse }) => {
    const bg = isHealthy
        ? 'linear-gradient(135deg, #00bfa5 0%, #00c853 100%)' // Modern Teal-Green
        : 'linear-gradient(135deg, #ff5252 0%, #d32f2f 100%)'; // Vibrant Red

    const shadowColor = isHealthy ? '#00e676' : '#ff5252';

    return (
        <Box
            sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: bg,
                border: '2px solid #fff',
                boxShadow: `0 2px 4px rgba(0,0,0,0.2), 0 0 8px ${shadowColor}80`, // Depth + Glow
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: pulse ? 'pulse 2s infinite' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '@keyframes pulse': {
                    '0%': { boxShadow: `0 0 0 0px ${shadowColor}80` },
                    '70%': { boxShadow: `0 0 0 6px ${shadowColor}00` },
                    '100%': { boxShadow: `0 0 0 0px ${shadowColor}00` },
                },
            }}
        >
            {count !== undefined && (
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#fff',
                        lineHeight: 1,
                        mt: '1px', // Optical centering
                        letterSpacing: '-0.5px'
                    }}
                >
                    {count}
                </Typography>
            )}
        </Box>
    );
};

export const WorkerStatusIndicator: React.FC = () => {
    const { t } = useTranslation('tasks');
    const { data, isLoading, isError } = useWorkerHealth();

    // Helper to translate status from backend
    const getStatusText = (status?: string) => {
        if (!status) return '';
        const statusMap: Record<string, string> = {
            'OK': t('status.ok', 'OK'),
            'No active workers': t('status.no_workers', 'No active workers'),
            'Monitoring Unavailable': t('status.unavailable', 'Monitoring Unavailable')
        };
        return statusMap[status] || status;
    };

    if (isLoading) {
        return (
            <Tooltip title={t('status.checking', 'Checking worker status...')}>
                <IconButton size="small">
                    <StatusLight pulse />
                </IconButton>
            </Tooltip>
        );
    }

    if (isError || !data) {
        return (
            <Tooltip title={t('status.unavailable_full', 'Worker monitoring unavailable')}>
                <IconButton size="small">
                    <StatusLight isHealthy={false} />
                </IconButton>
            </Tooltip>
        );
    }

    const { active_workers, status } = data;
    const isHealthy = active_workers > 0;
    // const color = isHealthy ? '#69f0ae' : '#ff5252'; // No longer needed
    // const textColor = isHealthy ? '#000000' : '#ffffff'; // No longer needed

    return (
        <Tooltip
            title={
                <Stack direction="column" spacing={1} sx={{ minWidth: 250 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {t('system_name', 'Tasks System')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: isHealthy ? '#69f0ae' : '#ff5252', fontWeight: 600 }}>
                                • {getStatusText(status)}
                            </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {active_workers} {t('nodes', 'nodes')}
                        </Typography>
                    </Box>

                    {/* Summary row */}
                    <Box sx={{ display: 'flex', gap: 2, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <Stack spacing={0}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>
                                {t('summary.active', 'Active')}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{data.active_tasks ?? 0}</Typography>
                        </Stack>
                        <Stack spacing={0}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>
                                {t('summary.queued', 'Queued')}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{data.queued_tasks ?? 0}</Typography>
                        </Stack>
                    </Box>

                    {/* Worker List */}
                    {data.workers && data.workers.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                            {data.workers.map((worker) => (
                                <Box key={worker.name} sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto auto',
                                    gap: 1.5,
                                    py: 0.5,
                                    '&:not(:last-child)': { borderBottom: '1px dashed rgba(255,255,255,0.1)' }
                                }}>
                                    <Box sx={{ overflow: 'hidden' }}>
                                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {worker.name.replace('celery@', '')}
                                        </Typography>
                                    </Box>

                                    <Stack direction="row" spacing={0.5} alignItems="center" title={`${t('worker.load', 'Load')}: Active / Capacity`}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                            {t('worker.load', 'Load')}:
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: worker.active_tasks >= worker.concurrency ? '#ffab40' : 'inherit' }}>
                                            {worker.active_tasks}/{worker.concurrency}
                                        </Typography>
                                    </Stack>

                                    <Stack direction="row" spacing={0.5} alignItems="center" title={t('worker.memory', 'Memory Usage (RSS)')}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                            {(worker.memory_usage / 1024).toFixed(0)} MB
                                        </Typography>
                                    </Stack>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Stack>
            }
            arrow
        >
            <IconButton size="small">
                <StatusLight isHealthy={isHealthy} count={active_workers} pulse={isHealthy} />
            </IconButton>
        </Tooltip>
    );
};
