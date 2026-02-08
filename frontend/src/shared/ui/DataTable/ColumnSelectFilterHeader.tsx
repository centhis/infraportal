import { type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useTranslation } from 'react-i18next';
import { styled, alpha } from '@mui/material/styles';

const StyledSelect = styled(Select)(({ theme }) => ({
    width: '100%',
    marginTop: theme.spacing(0.5),
    backgroundColor: alpha(theme.palette.common.white, 0.05),
    border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.75rem',
    transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow']),
    '& .MuiSelect-select': {
        padding: '2px 8px',
        height: '1.4em',
        lineHeight: '1.4em',
        display: 'flex',
        alignItems: 'center',
    },
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.08),
        borderColor: alpha(theme.palette.common.white, 0.2),
    },
    '&.Mui-focused': {
        backgroundColor: alpha(theme.palette.common.white, 0.1),
        borderColor: theme.palette.primary.main,
    },
    '& .MuiOutlinedInput-notchedOutline': {
        border: 'none',
    },
}));

interface FilterOption {
    value: string;
    label: string;
}

interface ColumnSelectFilterHeaderProps {
    /** Заголовок столбца */
    label: string;
    /** Текущее значение фильтра */
    value: string;
    /** Опции для выбора */
    options: FilterOption[];
    /** Текст для "Все" */
    allLabel?: string;
    /** Callback при изменении значения */
    onFilterChange: (value: string) => void;
}

/**
 * Компонент заголовка столбца с встроенным выпадающим списком для фильтрации.
 */
export function ColumnSelectFilterHeader({
    label,
    value,
    options,
    allLabel,
    onFilterChange,
}: ColumnSelectFilterHeaderProps) {
    const { t } = useTranslation();
    const displayAllLabel = allLabel || t('all', 'All');
    const handleChange = (event: SelectChangeEvent<unknown>) => {
        onFilterChange(event.target.value as string);
    };

    const handleClick = (event: MouseEvent) => {
        // Останавливаем всплытие, чтобы клик по селекту не вызывал сортировку
        event.stopPropagation();
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                py: 1,
            }}
        >
            <Box
                sx={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Box>
            <StyledSelect
                value={value || ''}
                onChange={handleChange}
                onClick={handleClick}
                displayEmpty
                size="small"
            >
                <MenuItem value="" sx={{ fontSize: '0.75rem' }}>
                    <em>{displayAllLabel}</em>
                </MenuItem>
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value} sx={{ fontSize: '0.75rem' }}>
                        {option.label}
                    </MenuItem>
                ))}
            </StyledSelect>
        </Box>
    );
}
