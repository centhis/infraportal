import React, { useState, useCallback } from 'react';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { BaseSetting, SettingValueType } from '../../api/settings.dto';

export interface SettingInputFieldProps {
    /** Объект настройки */
    setting: BaseSetting & { type?: 'boolean' | 'string' | 'bool'; is_sensitive?: boolean };
    /** Текущее значение */
    value: SettingValueType;
    /** Callback изменения значения */
    onChange: (value: SettingValueType) => void;
    /** Callback сохранения */
    onSave: () => void;
    /** Callback отмены */
    onCancel: () => void;
    /** Режим редактирования */
    isEditing: boolean;
    /** Значение изменено */
    isDirty: boolean;
    /** Загрузка */
    loading: boolean;
    /** Отключено */
    disabled?: boolean;
    /** Есть права на обновление */
    hasUpdatePermission: boolean;
    /** Ошибка валидации */
    validationError?: string | null;
    /** Начать редактирование */
    onStartEditing?: () => void;
}

/**
 * Универсальный компонент ввода для настроек.
 * Поддерживает: text, password (sensitive), boolean (switch).
 */
export function SettingInputField({
    setting,
    value,
    onChange,
    onSave,
    onCancel,
    isEditing,
    isDirty,
    loading,
    disabled = false,
    hasUpdatePermission,
    validationError,
    onStartEditing,
}: SettingInputFieldProps) {
    const { t } = useTranslation('settings');
    const [showPassword, setShowPassword] = useState(false);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && isDirty && !loading) {
                onSave();
            } else if (e.key === 'Escape') {
                onCancel();
            }
        },
        [isDirty, loading, onSave, onCancel]
    );

    // Переключатель (Boolean switch)
    if (setting.type === 'bool') {
        return (
            <Switch
                checked={value === 'true' || value === true}
                onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
                disabled={loading || !hasUpdatePermission || disabled}
                color="primary"
            />
        );
    }

    // Текстовое поле (TextField) (режим редактирования)
    if (isEditing || isDirty) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                    fullWidth
                    size="small"
                    type={setting.is_sensitive && !showPassword ? 'password' : 'text'}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    error={Boolean(validationError)}
                    helperText={validationError}
                    disabled={loading}
                    autoFocus
                    sx={{ minWidth: 200 }}
                    slotProps={{
                        input: setting.is_sensitive
                            ? {
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
                            }
                            : {},
                    }}
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {isDirty && (
                        <Tooltip title={!hasUpdatePermission ? t('common:no_permission', 'Недостаточно прав') : ''}>
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
                    <IconButton color="error" onClick={onCancel} disabled={loading} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>
        );
    }

    // Режим отображения (Display mode)
    const displayValue = setting.is_sensitive ? '●●●●●●●●' : (String(value) || t('core.table.empty'));

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
                        color: disabled || !hasUpdatePermission ? 'text.secondary' : 'primary.main',
                    },
                },
            }}
            onClick={() => !disabled && hasUpdatePermission && onStartEditing?.()}
        >
            <Typography variant="body2" color="text.secondary" className="edit-text" sx={{ transition: 'all 0.2s' }}>
                {displayValue}
            </Typography>
        </Box>
    );
}
