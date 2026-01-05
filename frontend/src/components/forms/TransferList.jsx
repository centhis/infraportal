import { useState, useMemo } from 'react';
import { Card, CardHeader, Divider, TextField, Tooltip, Chip, Box, List, ListItem } from '@mui/material';
import { useTranslation } from 'react-i18next';

const ListCard = ({ title, items, onChipClick, filterText, handleFilterChange, disabled, 'data-testid': dataTestId }) => {
    const { t } = useTranslation('user_management');
    const filteredItems = useMemo(() =>
        items.filter(item => item.name.toLowerCase().includes(filterText.toLowerCase())),
        [items, filterText]
    );

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
                }}
            >
                <List dense sx={{ py: 0 }}>
                    {filteredItems.map((item) => {
                        const i18nKey = `user_management.roles.permissions.${item.name.replace(':', '_')}`;
                        return (
                            <ListItem key={item.id} disablePadding>
                                <Tooltip title={t(i18nKey, { defaultValue: item.description })} placement="top">
                                    <span> {/* The Chip is wrapped in a span to allow Tooltip to work when chip is disabled */}
                                        <Chip
                                            label={item.name}
                                            onClick={() => onChipClick(item)}
                                            disabled={disabled}
                                            size="small"
                                            sx={{ width: '100%', justifyContent: 'flex-start' }}
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

export default function TransferList({ allItems, selectedIds, onChange, disabled }) {
  const [leftFilter, setLeftFilter] = useState('');
  const [rightFilter, setRightFilter] = useState('');

  const left = useMemo(() => allItems.filter(item => !selectedIds.includes(item.id)), [allItems, selectedIds]);
  const right = useMemo(() => allItems.filter(item => selectedIds.includes(item.id)), [allItems, selectedIds]);

  const handleAssign = (item) => {
    if (disabled) return;
    onChange([...selectedIds, item.id]);
  };

  const handleUnassign = (item) => {
    if (disabled) return;
    onChange(selectedIds.filter(id => id !== item.id));
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
        <Box sx={{ flex: 1 }}>
            <ListCard
                data-testid="transfer-list-available"
                title="Available"
                items={left}
                onChipClick={handleAssign}
                filterText={leftFilter}
                handleFilterChange={setLeftFilter}
                disabled={disabled}
            />
        </Box>
        <Box sx={{ flex: 1 }}>
            <ListCard
                data-testid="transfer-list-assigned"
                title="Assigned"
                items={right}
                onChipClick={handleUnassign}
                filterText={rightFilter}
                handleFilterChange={setRightFilter}
                disabled={disabled}
            />
        </Box>
    </Box>
  );
}