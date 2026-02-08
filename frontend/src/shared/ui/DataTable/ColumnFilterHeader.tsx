import { type ChangeEvent, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import { useTranslation } from 'react-i18next';
import { styled, alpha } from '@mui/material/styles';

const StyledFilterInput = styled(InputBase)(({ theme }) => ({
    width: '100%',
    marginTop: theme.spacing(0.5),
    padding: '2px 8px',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.05),
    border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
    fontSize: '0.75rem',
    transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow']),
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.08),
        borderColor: alpha(theme.palette.common.white, 0.2),
    },
    '&.Mui-focused': {
        backgroundColor: alpha(theme.palette.common.white, 0.1),
        borderColor: theme.palette.primary.main,
        boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`,
    },
    '& .MuiInputBase-input': {
        padding: 0,
        height: '1.4em',
    },
}));

interface ColumnFilterHeaderProps {
    /** Заголовок столбца */
    label: string;
    /** Текущее значение фильтра */
    value: string;
    /** Плейсхолдер */
    placeholder?: string;
    /** Callback при изменении значения */
    onFilterChange: (value: string) => void;
}

/**
 * Компонент заголовка столбца с встроенным полем фильтрации.
 */
export function ColumnFilterHeader({
    label,
    value,
    placeholder,
    onFilterChange,
}: ColumnFilterHeaderProps) {
    const { t } = useTranslation();
    const displayPlaceholder = placeholder || t('filter', 'Filter...');
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        onFilterChange(event.target.value);
    };

    const handleClick = (event: MouseEvent) => {
        // Останавливаем всплытие, чтобы клик по инпуту не вызывал сортировку
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
            <StyledFilterInput
                placeholder={displayPlaceholder}
                value={value}
                onChange={handleChange}
                onClick={handleClick}
            />
        </Box>
    );
}
