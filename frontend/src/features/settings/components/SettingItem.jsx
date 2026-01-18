import { useState, useEffect, useRef } from 'react';
import {
    ListItem,
    ListItemText,
    Switch,
    Box,
    ClickAwayListener,
    Typography,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import {
    Check as CheckIcon,
    Error as ErrorIcon,
    Save as SaveIcon,
    Visibility,
    VisibilityOff,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../app/providers/ToastProvider';
import { usePermissions } from '../../../app/providers/PermissionsProvider';
import { validateSetting } from '../utils/settingValidation';

const SettingItem = ({ setting, onUpdate, isHeaderToggle = false, disabled = false, isDraft = false, showSaveIcon = true }) => {
    const { t } = useTranslation('settings');
    const { showToast } = useToast();
    const { can } = usePermissions();
    const hasUpdatePermission = can('settings:update');

    const [value, setValue] = useState(setting.value || '');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('idle');
    const [validationError, setValidationError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const textRef = useRef(null);

    // Check for text truncation
    useEffect(() => {
        if (textRef.current) {
            setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
        }
    }, [value]);

    // Синхронизация локального значения с входящим пропсом
    useEffect(() => {
        setValue(setting.value || '');
        setValidationError(null);
    }, [setting.value]);

    const isDirty = value !== (setting.value || '');

    const handleSave = async () => {
        // Проверка валидности через Zod
        const validation = validateSetting(setting.key, value);
        if (!validation.success) {
            setValidationError(true);
            showToast(validation.error, 'error');
            return;
        }

        setValidationError(null);

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
            showToast(t('common:save_success', 'Настройка успешно сохранена'), 'success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (_err) {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };


    const handleToggleBoolean = async (e) => {
        const newValue = e.target.checked ? 'true' : 'false';

        if (isDraft) {
            onUpdate(setting.key, newValue);
            setValue(newValue);
            setStatus('success'); // Добавлено для консистентности
            setTimeout(() => setStatus('idle'), 3000); // Добавлено для консистентности
            return;
        }

        setLoading(true);
        setStatus('idle');
        try {
            await onUpdate(setting.key, newValue);
            setValue(newValue);
            setStatus('success');
            showToast(t('common:save_success', 'Настройка успешно сохранена'), 'success');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (_err) {
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setValue(setting.value || '');
        setIsEditing(false);
        setStatus('idle');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && isDirty && !loading) {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const renderInput = () => {
        if (setting.type === 'boolean') {
            return (
                <Switch
                    checked={value === 'true' || value === true}
                    onChange={handleToggleBoolean}
                    disabled={loading || !hasUpdatePermission}
                    color="primary"
                />
            );
        }

        if (isEditing || isDirty) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        type={setting.is_sensitive && !showPassword ? 'password' : 'text'}
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            if (validationError) setValidationError(null);
                        }}
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
                        {showSaveIcon && (!isDraft || isDirty) && (
                            <Tooltip title={!hasUpdatePermission ? t('common.no_permission', 'Недостаточно прав') : (!isDirty ? t('common.no_changes', 'Измените значение для сохранения') : '')}>
                                <span>
                                    <IconButton
                                        color="primary"
                                        onClick={handleSave}
                                        disabled={loading || !isDirty || !hasUpdatePermission}
                                        size="small"
                                        title={t('common.save', 'Сохранить')}
                                    >
                                        {loading ? <CircularProgress size={20} /> : <SaveIcon />}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                        <IconButton
                            color="error"
                            onClick={handleCancel}
                            disabled={loading}
                            size="small"
                            title={t('common.cancel', 'Отменить')}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            );
        }

        if (isHeaderToggle) {
            return (
                <Switch
                    checked={value === 'true' || value === true}
                    onChange={handleToggleBoolean}
                    disabled={loading || !hasUpdatePermission}
                    color="primary"
                />
            );
        }

        return (
            <Tooltip
                title={setting.is_sensitive ? t('common.sensitive_value_masked') : value}
                arrow
                disableHoverListener={!isTruncated && !setting.is_sensitive}
                slotProps={{
                    popper: {
                        sx: {
                            '& .MuiTooltip-tooltip': {
                                whiteSpace: 'nowrap',
                                maxWidth: 'none',
                            },
                        },
                    },
                }}
            >
                <Box
                    ref={textRef}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: disabled || !hasUpdatePermission ? 'default' : 'pointer',
                        opacity: disabled ? 0.6 : 1,
                        maxWidth: '350px', // Constrain width for truncation
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        '&:hover': {
                            '& .edit-text': {
                                textDecoration: disabled || !hasUpdatePermission ? 'none' : 'underline',
                                color: disabled || !hasUpdatePermission ? 'text.secondary' : 'primary.main'
                            }
                        }
                    }}
                    onClick={() => !disabled && hasUpdatePermission && setIsEditing(true)}
                >
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        className="edit-text"
                        sx={{ transition: 'all 0.2s', flexShrink: 1 }}
                    >
                        {setting.is_sensitive ? '********' : (value || t('core.table.empty'))}
                    </Typography>
                </Box>
            </Tooltip>
        );
    };

    return (
        <ClickAwayListener onClickAway={() => {
            if (isHeaderToggle) return;
            if (isEditing || isDirty) {
                if (isDraft && isDirty) {
                    handleSave(); // Авто-применение в черновик при клике в сторону
                } else if (!isDraft) {
                    handleCancel(); // В обычном режиме сбрасываем, если не нажали Сохранить
                } else if (isDraft && !isDirty) {
                    setIsEditing(false); // Если ничего не меняли, просто закрываем режим правки
                }
            }
        }}>
            <ListItem
                divider={!isHeaderToggle}
                sx={isHeaderToggle ? { p: 0 } : {
                    py: 2,
                    px: 3,
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                    flexWrap: 'wrap'
                }}
            >
                {!isHeaderToggle && (
                    <ListItemText
                        primary={t(`keys.${setting.key}.label`, setting.key)}
                        secondary={t(`keys.${setting.key}.description`, '')}
                        sx={{ flex: '1 1 300px' }}
                    />
                )}
                <Box sx={isHeaderToggle ? {} : {
                    flex: '0 0 auto',
                    ml: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minHeight: 40
                }}>
                    {renderInput()}
                    {!isHeaderToggle && status === 'success' && <CheckIcon color="success" fontSize="small" />}
                    {!isHeaderToggle && status === 'error' && <ErrorIcon color="error" fontSize="small" />}
                </Box>
            </ListItem>
        </ClickAwayListener>
    );
};

export default SettingItem;
