import { useState, useMemo } from 'react';
import { Card, CardHeader, Divider, TextField, Tooltip, Chip, Box, List, ListItem } from '@mui/material';
import { useTranslation } from 'react-i18next'; // Import useTranslation here

const ListCard = ({ title, items, onChipClick, filterText, handleFilterChange, disabled, 'data-testid': dataTestId, itemType, disabledItemsIds = [] }) => {
    const { t } = useTranslation('user_management'); // keep this useTranslation for item descriptions
    const filteredItems = useMemo(() =>
        items.filter(item => item.name.toLowerCase().includes(filterText.toLowerCase())),
        [items, filterText]
    );

    const ITEM_HEIGHT = 32; // Approximate height of a ListItem with Chip
    const FIXED_LIST_HEIGHT = 5 * ITEM_HEIGHT; // Height for exactly 5 items

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
                        disabled={disabled}
                    />
                }
            />
            <Divider />
            <Box
                sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    p: 1,
                    height: `${FIXED_LIST_HEIGHT}px`, // Fixed height for 5 items
                    minHeight: `${FIXED_LIST_HEIGHT}px`, // Minimum height for 5 items
                    maxHeight: `${FIXED_LIST_HEIGHT}px`, // Maximum height for 5 items
                }}
            >
                <List dense sx={{ py: 0 }}>
                    {filteredItems.map((item) => {
                        let tooltipTitle;
                        if (itemType === 'permission') {
                            const i18nPermissionKey = `user_management.roles.permissions.${item.name.replace(':', '_')}`;
                            tooltipTitle = t(i18nPermissionKey, { defaultValue: item.description });
                        } else {
                            tooltipTitle = item.description; // Directly use description, no translation needed
                        }
                        const isBuiltIn = disabledItemsIds.includes(item.id);

                        return (
                            <ListItem key={item.id} disablePadding>
                                <Tooltip title={tooltipTitle} placement="top">
                                    <span> {/* The Chip is wrapped in a span to allow Tooltip to work when chip is disabled */}
                                        <Chip
                                            data-testid={`chip-${item.name}`}
                                            label={item.name}
                                            onClick={() => onChipClick(item)}
                                            disabled={disabled || isBuiltIn}
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

export default function TransferList({ allItems, selectedIds, onChange, disabled, itemType, disabledItemsIds = [] }) { // Add disabledItemsIds prop
  const [leftFilter, setLeftFilter] = useState('');
  const [rightFilter, setRightFilter] = useState('');
  const { t } = useTranslation('common'); // useTranslation for "Available" and "Assigned" - now from 'common' namespace

  const left = useMemo(() => allItems.filter(item => !selectedIds.includes(item.id)), [allItems, selectedIds]);
  const right = useMemo(() => allItems.filter(item => selectedIds.includes(item.id)), [allItems, selectedIds]);

  const handleAssign = (item) => {
    if (disabled || disabledItemsIds.includes(item.id)) return;

    let newSelectedIds = [...selectedIds, item.id];

    // Automatic addition of 'users:view' if any other 'users:*' permission is added
    if (itemType === 'permission' && item.name.startsWith('users:') && item.name !== 'users:view') {
      const usersViewPermission = allItems.find(p => p.name === 'users:view');
      if (usersViewPermission && !newSelectedIds.includes(usersViewPermission.id)) {
        newSelectedIds.push(usersViewPermission.id);
      }
    }
    onChange(newSelectedIds);
  };

  const handleUnassign = (item) => {
    if (disabled || disabledItemsIds.includes(item.id)) return;
  
    let newSelectedIds = selectedIds.filter(id => id !== item.id);
  
    // If the unassigned item is 'users:view', check if other 'users:*' permissions remain.
    if (itemType === 'permission' && item.name === 'users:view') {
      const otherUserPermissions = allItems.filter(p =>
        p.name.startsWith('users:') &&
        p.name !== 'users:view' &&
        newSelectedIds.includes(p.id)
      );
      // If other 'users:*' permissions exist, do not remove 'users:view'.
      if (otherUserPermissions.length > 0) {
        return; // Early return to prevent unassignment
      }
    }
    onChange(newSelectedIds);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
        <Box sx={{ flex: 1 }}>
            <ListCard
                data-testid="transfer-list-available"
                title={t('transfer_list.available')} // Use translation key
                items={left}
                onChipClick={handleAssign}
                filterText={leftFilter}
                handleFilterChange={setLeftFilter}
                disabled={disabled}
                itemType={itemType} // Pass itemType here
                disabledItemsIds={disabledItemsIds}
            />
        </Box>
        <Box sx={{ flex: 1 }}>
            <ListCard
                data-testid="transfer-list-assigned"
                title={t('transfer_list.assigned')} // Use translation key
                items={right}
                onChipClick={handleUnassign}
                filterText={rightFilter}
                handleFilterChange={setRightFilter}
                disabled={disabled}
                itemType={itemType} // Pass itemType here
                disabledItemsIds={disabledItemsIds} // Pass disabledItemsIds to ListCard
            />
        </Box>
    </Box>
  );
}