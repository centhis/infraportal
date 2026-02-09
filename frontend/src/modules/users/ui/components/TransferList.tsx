import { useState, useMemo } from 'react';
import { Card, CardHeader, Divider, TextField, Tooltip, Chip, Box, List, ListItem } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface TransferListItem {
    id: number;
    name: string;
    description?: string | null;
}

interface ListCardProps {
    title: string;
    items: TransferListItem[];
    onChipClick: (item: TransferListItem) => void;
    filterText: string;
    handleFilterChange: (value: string) => void;
    disabled?: boolean;
    'data-testid'?: string;
    itemType?: 'permission' | 'role' | 'user' | 'group' | undefined;
    disabledItemsIds?: number[];
}

const ListCard = ({
    title,
    items,
    onChipClick,
    filterText,
    handleFilterChange,
    disabled,
    'data-testid': dataTestId,
    itemType,
    disabledItemsIds = []
}: ListCardProps) => {
    const { t } = useTranslation('user_management');

    const filteredItems = useMemo(() =>
        items.filter(item => item.name.toLowerCase().includes(filterText.toLowerCase())),
        [items, filterText]
    );

    const ITEM_HEIGHT = 32;
    const FIXED_LIST_HEIGHT = 5 * ITEM_HEIGHT;

    return (
        <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }} data-testid={dataTestId}>
            <CardHeader
                sx={{ px: 2, py: 1 }}
                title={
                    <TextField
                        size="small"
                        variant="outlined"
                        fullWidth
                        label={title}
                        value={filterText}
                        onChange={(e) => handleFilterChange(e.target.value)}
                        disabled={!!disabled}
                    />
                }
            />
            <Divider />
            <Box
                sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    p: 1,
                    height: `${FIXED_LIST_HEIGHT}px`,
                    minHeight: `${FIXED_LIST_HEIGHT}px`,
                    maxHeight: `${FIXED_LIST_HEIGHT}px`,
                }}
            >
                <List dense sx={{ py: 0 }}>
                    {filteredItems.map((item) => {
                        let tooltipTitle: string | null | undefined;
                        if (itemType === 'permission') {
                            // Заменяем двоеточия на нижние подчеркивания для ключей перевода (например, users:view -> users_view)
                            const i18nPermissionKey = `user_management.roles.permissions.${item.name.replace(':', '_')}`;
                            tooltipTitle = t(i18nPermissionKey, { defaultValue: item.description || '' });
                        } else {
                            tooltipTitle = item.description;
                        }
                        const isBuiltIn = disabledItemsIds.includes(item.id);

                        return (
                            <ListItem key={item.id} disablePadding>
                                <Tooltip title={tooltipTitle || ''} placement="top">
                                    <span>
                                        <Chip
                                            data-testid={`chip-${item.name}`}
                                            label={item.name}
                                            onClick={() => onChipClick(item)}
                                            disabled={!!disabled || isBuiltIn}
                                            size="small"
                                            sx={{ width: '100%', justifyContent: 'flex-start' }}
                                            color={isBuiltIn ? "primary" : "default"}
                                            variant={isBuiltIn ? "outlined" : "filled"}
                                        />
                                    </span>
                                </Tooltip>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>
        </Card>
    );
};

export interface TransferListProps {
    allItems: TransferListItem[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    disabled?: boolean;
    itemType?: 'permission' | 'role' | 'user' | 'group';
    disabledItemsIds?: number[];
}

export function TransferList({
    allItems,
    selectedIds,
    onChange,
    disabled = false,
    itemType,
    disabledItemsIds = []
}: TransferListProps) {
    const [leftFilter, setLeftFilter] = useState('');
    const [rightFilter, setRightFilter] = useState('');
    const { t } = useTranslation('common');

    const left = useMemo(() => allItems.filter(item => !selectedIds.includes(item.id)), [allItems, selectedIds]);
    const right = useMemo(() => allItems.filter(item => selectedIds.includes(item.id)), [allItems, selectedIds]);

    const handleAssign = (item: TransferListItem) => {
        if (disabled || disabledItemsIds.includes(item.id)) return;

        let newSelectedIds = [...selectedIds, item.id];

        // Автоматическое добавление 'users:view', если добавлено любое другое разрешение 'users:*'
        if (itemType === 'permission' && item.name.startsWith('users:') && item.name !== 'users:view') {
            const usersViewPermission = allItems.find(p => p.name === 'users:view');
            if (usersViewPermission && !newSelectedIds.includes(usersViewPermission.id)) {
                newSelectedIds.push(usersViewPermission.id);
            }
        }

        // Автоматическое добавление 'settings:view', если добавлено 'settings:update'
        if (itemType === 'permission' && item.name === 'settings:update') {
            const settingsViewPermission = allItems.find(p => p.name === 'settings:view');
            if (settingsViewPermission && !newSelectedIds.includes(settingsViewPermission.id)) {
                newSelectedIds.push(settingsViewPermission.id);
            }
        }

        onChange(newSelectedIds);
    };

    const handleUnassign = (item: TransferListItem) => {
        if (disabled || disabledItemsIds.includes(item.id)) return;

        const newSelectedIds = selectedIds.filter(id => id !== item.id);

        // Если удаляемый элемент - 'users:view', проверяем, остались ли другие разрешения 'users:*'.
        if (itemType === 'permission' && item.name === 'users:view') {
            const otherUserPermissions = allItems.filter(p =>
                p.name.startsWith('users:') &&
                p.name !== 'users:view' &&
                newSelectedIds.includes(p.id)
            );
            // Если есть другие разрешения 'users:*', не удаляем 'users:view'.
            if (otherUserPermissions.length > 0) {
                return;
            }
        }

        // Если удаляемый элемент - 'settings:view', проверяем, осталось ли 'settings:update'.
        if (itemType === 'permission' && item.name === 'settings:view') {
            const settingsUpdatePermission = allItems.find(p => p.name === 'settings:update');
            if (settingsUpdatePermission && newSelectedIds.includes(settingsUpdatePermission.id)) {
                return;
            }
        }

        onChange(newSelectedIds);
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <Box sx={{ flex: 1 }}>
                <ListCard
                    data-testid="transfer-list-available"
                    title={t('transfer_list.available')}
                    items={left}
                    onChipClick={handleAssign}
                    filterText={leftFilter}
                    handleFilterChange={setLeftFilter}
                    disabled={disabled}
                    itemType={itemType}
                    disabledItemsIds={disabledItemsIds}
                />
            </Box>
            <Box sx={{ flex: 1 }}>
                <ListCard
                    data-testid="transfer-list-assigned"
                    title={t('transfer_list.assigned')}
                    items={right}
                    onChipClick={handleUnassign}
                    filterText={rightFilter}
                    handleFilterChange={setRightFilter}
                    disabled={disabled}
                    itemType={itemType}
                    disabledItemsIds={disabledItemsIds}
                />
            </Box>
        </Box>
    );
}
