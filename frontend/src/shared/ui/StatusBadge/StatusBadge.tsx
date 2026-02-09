import Chip, { type ChipProps } from '@mui/material/Chip';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface StatusBadgeProps {
    /** Текст статуса */
    label: string;
    /** Вариант (определяет цвет) */
    variant?: StatusVariant;
    /** Размер */
    size?: 'small' | 'medium';
    /** Дополнительные props для Chip */
    chipProps?: Omit<ChipProps, 'label' | 'color' | 'size' | 'variant'>;
}

const variantToColor = {
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
    default: 'default',
} as const;

/**
 * Бейдж статуса с предопределёнными цветами.
 */
export function StatusBadge({
    label,
    variant = 'default',
    size = 'small',
    chipProps,
}: StatusBadgeProps) {
    return (
        <Chip
            label={label}
            color={variantToColor[variant]}
            size={size}
            variant="filled"
            {...chipProps}
        />
    );
}
