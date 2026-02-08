import { useState, useEffect, useRef } from 'react';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import CheckIcon from '@mui/icons-material/Check';
import ErrorIcon from '@mui/icons-material/Error';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@core/auth';
import { SettingInputField } from './SettingInputField';
import type { BaseSetting, SettingValueType } from '../../api/settings.dto';

export interface SettingItemProps {
    /** Объект настройки */
    setting: BaseSetting & { type?: 'boolean' | 'string' | 'bool'; is_sensitive?: boolean };
    /** Callback обновления */
    onUpdate: (key: string, value: SettingValueType) => Promise<void> | void;
    /** Режим header toggle (без label) */
    isHeaderToggle?: boolean;
    /** Отключено */
    disabled?: boolean;
    /** Draft режим (без сохранения на сервер) */
    isDraft?: boolean;
    /** Показывать иконку сохранения */
    showSaveIcon?: boolean;
    /** Функция валидации */
    validate?: (value: SettingValueType) => string | null;
}

type Status = 'idle' | 'success' | 'error';

/**
 * Элемент настройки с inline редактированием
 */
export function SettingItem({
    setting,
    onUpdate,
    isHeaderToggle = false,
    disabled = false,
    isDraft = false,
    showSaveIcon = true,
    validate,
}: SettingItemProps) {
    const { t } = useTranslation('settings');
    const { can } = usePermissions();
    const hasUpdatePermission = can('settings:update');

    const [value, setValue] = useState<SettingValueType>(setting.value ?? '');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<Status>('idle');
    const [validationError, setValidationError] = useState<string | null>(null);
    const textRef = useRef<HTMLDivElement>(null);

    // Синхронизация с пропсами
    useEffect(() => {
        setValue(setting.value ?? '');
        setValidationError(null);
    }, [setting.value]);

    const isDirty = value !== (setting.value ?? '');

    const handleSave = async () => {
        setValidationError(null);

        if (validate) {
            const error = validate(value);
            if (error) {
                setValidationError(error);
                return;
            }
        }

        if (isDraft) {
            onUpdate(setting.key, value);
            setIsEditing(false);
            return;
        }

        setLoading(true);
        setStatus('idle');
        try {
            await onUpdate(setting.key, value);
            setStatus('success');
            setIsEditing(false);
            setTimeout(() => setStatus('idle'), 3000);
        } catch {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setValue(setting.value ?? '');
        setIsEditing(false);
        setStatus('idle');
    };

    const handleClickAway = () => {
        if (isHeaderToggle) return;
        if (isEditing || isDirty) {
            if (isDraft && isDirty) {
                // Для draft режима автосохранения нет при click away, 
                // так как он сохраняется в реальном времени в handleUpdate.
                // Просто выходим из режима редактирования.
                setIsEditing(false);
            } else if (!isDraft && isDirty) {
                // Предлагаем сохранить или отменить? 
                // Текущая логика: cancel. Можно изменить на save если нужно auto-save.
                handleCancel();
            } else {
                setIsEditing(false);
            }
        }
    };

    const handleRowClick = () => {
        if (!isEditing && !disabled && hasUpdatePermission) {
            setIsEditing(true);
        }
    };

    return (
        <ClickAwayListener onClickAway={handleClickAway}>
            <ListItem
                divider={!isHeaderToggle}
                onClick={handleRowClick}
                sx={
                    isHeaderToggle
                        ? { p: 0 }
                        : {
                            py: 2,
                            px: 3,
                            '&:hover': {
                                bgcolor: disabled ? 'transparent' : 'action.hover',
                                cursor: !isEditing && !disabled && hasUpdatePermission ? 'pointer' : 'default'
                            },
                            flexWrap: 'wrap',
                        }
                }
            >
                {!isHeaderToggle && (
                    <ListItemText
                        primary={t(`keys.${setting.key}.label`, setting.key)}
                        secondary={t(`keys.${setting.key}.description`, '')}
                        sx={{ flex: '1 1 300px' }}
                    />
                )}
                <Box
                    ref={textRef}
                    sx={
                        isHeaderToggle
                            ? {}
                            : {
                                flex: '0 0 auto',
                                ml: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                minHeight: 40,
                            }
                    }
                >
                    <SettingInputField
                        setting={setting}
                        value={value}
                        onChange={(newValue) => {
                            setValue(newValue);
                            if (isDraft) {
                                onUpdate(setting.key, newValue);
                            }
                            if (validationError) setValidationError(null);
                        }}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        isEditing={isEditing}
                        isDirty={isDirty && showSaveIcon}
                        loading={loading}
                        disabled={disabled}
                        hasUpdatePermission={hasUpdatePermission}
                        validationError={validationError}
                        onStartEditing={() => setIsEditing(true)}
                    />
                    {!isHeaderToggle && status === 'success' && <CheckIcon color="success" fontSize="small" />}
                    {!isHeaderToggle && status === 'error' && <ErrorIcon color="error" fontSize="small" />}
                </Box>
            </ListItem>
        </ClickAwayListener>
    );
}
