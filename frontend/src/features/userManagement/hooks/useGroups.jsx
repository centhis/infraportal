import { useEffect, useState, useCallback } from "react";
import { groupsService } from "../services/groupsService";
import usePersistentState from "../../../shared/hooks/usePersistentState";
import { GROUP_PAGINATION_KEY } from "../../../shared/constants/keys";

// This hook is refactored to be consistent with useUsers.jsx,
// while also supporting a 'paginated' option to prevent file duplication.
export default function useGroups(options = { paginated: true }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginationModel, setPaginationModel] = usePersistentState(GROUP_PAGINATION_KEY, { page: 0, pageSize: 10 });
    const [rowCount, setRowCount] = useState(0);

    const refetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            let params = { limit: 1000, skip: 0 };
            if (options.paginated) {
                const { page, pageSize } = paginationModel;
                params = { skip: page * pageSize, limit: pageSize };
            }
            const data = await groupsService.list(params);
            setGroups(data.groups || []);
            if (options.paginated) {
                setRowCount(data.total);
            }
        } catch (error) {
            console.error("Failed to fetch groups", error);
            setGroups([]);
            if (options.paginated) {
                setRowCount(0);
            }
        } finally {
            setLoading(false);
        }
    }, [paginationModel, options.paginated]);

    const createGroup = async (group) => {
        const newGroup = await groupsService.create(group);
        setGroups(prev => [...prev, newGroup]);
        if (options.paginated) {
            setRowCount(prev => prev + 1);
        }
    };

    const updateGroup = async (id, updateGroupData) => {
        const updatedGroup = await groupsService.update(id, updateGroupData);
        setGroups(prev => prev.map(g => (g.id === id ? updatedGroup : g)));
    };

    const deleteGroup = async (id) => {
        await groupsService.remove(id);
        setGroups(prev => prev.filter(g => g.id !== id));
        if (options.paginated) {
            setRowCount(prev => prev - 1);
        }
    };

    useEffect(() => {
        refetchGroups();
    }, [refetchGroups]);

    return {
        groups,
        loading,
        paginationModel,
        setPaginationModel,
        rowCount,
        refetchGroups,
        createGroup,
        updateGroup,
        deleteGroup,
    };
}