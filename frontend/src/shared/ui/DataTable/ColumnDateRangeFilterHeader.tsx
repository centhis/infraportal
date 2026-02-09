import { useState, type MouseEvent, type SyntheticEvent } from 'react';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { styled, alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';

const FilterButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
    marginTop: theme.spacing(0.5),
    padding: '2px 8px',
    fontSize: '0.75rem',
    justifyContent: 'flex-start',
    textTransform: 'none',
    width: '100%',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: active
        ? alpha(theme.palette.primary.main, 0.15)
        : alpha(theme.palette.common.white, 0.05),
    border: `1px solid ${active
        ? theme.palette.primary.main
        : alpha(theme.palette.common.white, 0.1)}`,
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    '&:hover': {
        backgroundColor: active
            ? alpha(theme.palette.primary.main, 0.2)
            : alpha(theme.palette.common.white, 0.08),
        borderColor: active ? theme.palette.primary.main : alpha(theme.palette.common.white, 0.2),
    },
}));

interface ColumnDateRangeFilterHeaderProps {
    /** Заголовок столбца */
    label: string;
    /** Начальная дата (ISO string) */
    fromValue: string;
    /** Конечная дата (ISO string) */
    toValue: string;
    /** Callback при изменении диапазона */
    onFilterChange: (from: string, to: string) => void;
    /** Placeholder для "От" */
    fromPlaceholder?: string;
    /** Placeholder для "До" */
    toPlaceholder?: string;
}

export function ColumnDateRangeFilterHeader({
    label,
    fromValue,
    toValue,
    onFilterChange,
}: ColumnDateRangeFilterHeaderProps) {
    const { t, i18n } = useTranslation();
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [showCustom, setShowCustom] = useState(false);

    const [tempFrom, setTempFrom] = useState<Dayjs | null>(fromValue ? dayjs(fromValue) : null);
    const [tempTo, setTempTo] = useState<Dayjs | null>(toValue ? dayjs(toValue) : null);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (event?: object) => {
        if (event && 'stopPropagation' in event) {
            (event as SyntheticEvent).stopPropagation();
        }
        setAnchorEl(null);
        setShowCustom(false);
    };

    const applyRange = (from: Dayjs | null, to: Dayjs | null) => {
        onFilterChange(from ? from.toISOString() : '', to ? to.toISOString() : '');
        handleClose();
    };

    const setQuickRange = (range: string) => {
        const now = dayjs();
        let from: Dayjs | null = null;
        let to: Dayjs | null = now;

        switch (range) {
            case 'today':
                from = now.startOf('day');
                to = now.endOf('day');
                break;
            case 'yesterday':
                from = now.subtract(1, 'day').startOf('day');
                to = now.subtract(1, 'day').endOf('day');
                break;
            case 'last7':
                from = now.subtract(7, 'days').startOf('day');
                break;
            case 'last30':
                from = now.subtract(30, 'days').startOf('day');
                break;
            case 'all':
                from = null;
                to = null;
                break;
        }
        applyRange(from, to);
    };

    const isActive = !!(fromValue || toValue);

    const getDisplayValue = () => {
        if (!isActive) return t('filter', 'Filter...');
        if (fromValue && toValue) return `${dayjs(fromValue).format('DD.MM')} - ${dayjs(toValue).format('DD.MM')}`;
        if (fromValue) return `> ${dayjs(fromValue).format('DD.MM')}`;
        if (toValue) return `< ${dayjs(toValue).format('DD.MM')}`;
        return t('filter', 'Filter...');
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', py: 1 }}>
                <Box sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</Box>
                <FilterButton
                    active={isActive}
                    onClick={handleClick}
                    startIcon={isActive ? <FilterAltIcon sx={{ fontSize: '1rem' }} /> : <CalendarTodayIcon sx={{ fontSize: '1rem' }} />}
                >
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getDisplayValue()}
                    </Box>
                </FilterButton>

                <Popover
                    open={Boolean(anchorEl)}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    onClick={(e) => e.stopPropagation()}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    PaperProps={{ sx: { width: 220, mt: 0.5 } }}
                >
                    {!showCustom ? (
                        <List sx={{ py: 0.5 }}>
                            <ListItemButton onClick={() => setQuickRange('all')}>
                                <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }} primary={t('all_time', 'All time')} />
                            </ListItemButton>
                            <Divider />
                            <ListItemButton onClick={() => setQuickRange('today')}>
                                <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }} primary={t('today', 'Today')} />
                            </ListItemButton>
                            <ListItemButton onClick={() => setQuickRange('yesterday')}>
                                <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }} primary={t('yesterday', 'Yesterday')} />
                            </ListItemButton>
                            <ListItemButton onClick={() => setQuickRange('last7')}>
                                <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }} primary={t('last_7_days', 'Last 7 days')} />
                            </ListItemButton>
                            <ListItemButton onClick={() => setQuickRange('last30')}>
                                <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }} primary={t('last_30_days', 'Last 30 days')} />
                            </ListItemButton>
                            <Divider />
                            <ListItemButton onClick={() => setShowCustom(true)}>
                                <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }} primary={t('custom_range', 'Custom range...')} />
                            </ListItemButton>
                        </List>
                    ) : (
                        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <DatePicker
                                label={t('from', 'From')}
                                value={tempFrom}
                                onChange={setTempFrom}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                            <DatePicker
                                label={t('to', 'To')}
                                value={tempTo}
                                onChange={setTempTo}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                                <Button size="small" onClick={() => setShowCustom(false)}>{t('back', 'Back')}</Button>
                                <Button size="small" variant="contained" onClick={() => applyRange(tempFrom, tempTo)}>{t('apply', 'Apply')}</Button>
                            </Box>
                        </Box>
                    )}
                </Popover>
            </Box>
        </LocalizationProvider>
    );
}
