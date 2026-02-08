import { useState, type MouseEvent } from 'react';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { type GridColDef } from '@mui/x-data-grid';

interface ColumnVisibilityButtonProps {
    /** Список всех колонок */
    columns: GridColDef[];
    /** Текущая модель видимости */
    model: Record<string, boolean>;
    /** Callback при изменении видимости */
    onModelChange: (model: Record<string, boolean>) => void;
}

/**
 * Кнопка для настройки видимости столбцов таблицы с выпадающим меню.
 */
export function ColumnVisibilityButton({
    columns,
    model,
    onModelChange,
}: ColumnVisibilityButtonProps) {
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleToggle = (field: string) => {
        const isVisible = model[field] !== false;
        onModelChange({
            ...model,
            [field]: !isVisible,
        });
    };

    // Фильтруем колонки, которые нельзя скрывать (например, действия)
    const toggleableColumns = columns.filter(
        (col) => col.field !== 'actions' && col.headerName
    );

    return (
        <>
            <Tooltip title={t('columns_visibility', 'Columns visibility')}>
                <IconButton onClick={handleClick} color="primary">
                    <ViewColumnIcon />
                </IconButton>
            </Tooltip>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        p: 2,
                        width: 240,
                        maxHeight: 400,
                        mt: 1,
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(8px)',
                        backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.9)' : '#fff'),
                    },
                }}
            >
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    {t('show_hide_columns', 'Show / Hide Columns')}
                </Typography>
                <FormGroup>
                    {toggleableColumns.map((col) => (
                        <FormControlLabel
                            key={col.field}
                            control={
                                <Checkbox
                                    size="small"
                                    checked={model[col.field] !== false}
                                    onChange={() => handleToggle(col.field)}
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                                    {col.headerName}
                                </Typography>
                            }
                            sx={{
                                m: 0,
                                '&:hover': {
                                    backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                                },
                                borderRadius: 1,
                                width: '100%',
                            }}
                        />
                    ))}
                </FormGroup>
            </Popover>
        </>
    );
}
