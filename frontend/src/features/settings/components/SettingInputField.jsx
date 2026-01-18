import { useState, useCallback } from 'react';
import {
    TextField,
    Switch,
    IconButton,
    InputAdornment,
    Typography,
    Box,
    CircularProgress,
    Tooltip
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Save as SaveIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * Универсальный компонент ввода для настроек.
 * Поддерживает: text, password (sensitive), boolean (switch).
 * Инкапсулирует логику отображения/скрытия паролей и маскирование.
 */
const SettingInputField = ({
    setting,
    value,
    onChange,
    onSave,
    onCancel,
    isEditing,
    isDirty,
    loading,
    disabled,
    hasUpdatePermission,
    validationError,
    onStartEditing
}) => {
    const { t } = useTranslation('settings');
    const [showPassword, setShowPassword] = useState(false);

    // Обработка клавиш
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && isDirty && !loading) {
            onSave();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    }, [isDirty, loading, onSave, onCancel]);

    // Рендер Switch для boolean типа
    if (setting.type === 'boolean') {
        return (
            <Switch
                checked={value === 'true' || value === true}
                onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
                disabled={loading || !hasUpdatePermission || disabled}
                color="primary"
            />
        );
    }

    // Рендер TextField (режим редактирования)
    if (isEditing || isDirty) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                    fullWidth
                    size="small"
                    type={setting.is_sensitive && !showPassword ? 'password' : 'text'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    error={Boolean(validationError)}
                    disabled={loading}
                    autoFocus
                    sx={{ minWidth: 200 }}
                    InputProps={setting.is_sensitive ? {
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    edge="end"
                                    size="small"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    } : {}}
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {isDirty && (
                        <Tooltip title={!hasUpdatePermission ? t('common.no_permission', 'Недостаточно прав') : ''}>
                            <span>
                                <IconButton
                                    color="primary"
                                    onClick={onSave}
                                    disabled={loading || !isDirty || !hasUpdatePermission}
                                    size="small"
                                >
                                    {loading ? <CircularProgress size={20} /> : <SaveIcon />}
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                    <IconButton
                        color="error"
                        onClick={onCancel}
                        disabled={loading}
                        size="small"
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>
        );
    }

    // Рендер отображения текста (режим просмотра)
    const displayValue = setting.is_sensitive
        ? '●●●●●●●●'
        : (value || t('core.table.empty'));

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: disabled || !hasUpdatePermission ? 'default' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                '&:hover': {
                    '& .edit-text': {
                        textDecoration: disabled || !hasUpdatePermission ? 'none' : 'underline',
                        color: disabled || !hasUpdatePermission ? 'text.secondary' : 'primary.main'
                    }
                }
            }}
            onClick={() => !disabled && hasUpdatePermission && onStartEditing && onStartEditing()}
        >
            <Typography
                variant="body2"
                color="text.secondary"
                className="edit-text"
                sx={{ transition: 'all 0.2s' }}
            >
                {displayValue}
            </Typography>
        </Box>
    );
};

export default SettingInputField;
