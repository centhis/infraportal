import { useEffect, useState, useCallback } from "react";
import { rolesService } from "../services/rolesService";
import usePersistentState from "../../../shared/hooks/usePersistentState";
import { ROLE_PAGINATION_KEY } from "../../../shared/constants/keys";

// This hook is refactored to be consistent with useUsers.jsx,
// while also supporting a 'paginated' option to prevent file duplication.
export default function useRoles(options = { paginated: true }) {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginationModel, setPaginationModel] = usePersistentState(ROLE_PAGINATION_KEY, { page: 0, pageSize: 10 });
    const [rowCount, setRowCount] = useState(0);

    const refetchRoles = useCallback(async () => {
        setLoading(true);
        try {
            let params = { limit: 1000, skip: 0 };
            if (options.paginated) {
                const { page, pageSize } = paginationModel;
                params = { skip: page * pageSize, limit: pageSize };
            }
            const data = await rolesService.list(params);
            setRoles(data.roles || []);
            if (options.paginated) {
                setRowCount(data.total);
            }
        } catch (error) {
            console.error("Failed to fetch roles", error);
            setRoles([]);
            if (options.paginated) {
                setRowCount(0);
            }
        } finally {
            setLoading(false);
        }
    }, [paginationModel, options.paginated]);

    const createRole = async (role) => {
        const newRole = await rolesService.create(role);
        setRoles(prev => [...prev, newRole]);
        if (options.paginated) {
            setRowCount(prev => prev + 1);
        }
    };

    const updateRole = async (id, updateRoleData) => {
        const updatedRole = await rolesService.update(id, updateRoleData);
        setRoles(prev => prev.map(r => (r.id === id ? updatedRole : r)));
    };

    const deleteRole = async (id) => {
        await rolesService.remove(id);
        setRoles(prev => prev.filter(r => r.id !== id));
        if (options.paginated) {
            setRowCount(prev => prev - 1);
        }
    };

    useEffect(() => {
        refetchRoles();
    }, [refetchRoles]);

    return {
        roles,
        loading,
        paginationModel,
        setPaginationModel,
        rowCount,
        refetchRoles,
        createRole,
        updateRole,
        deleteRole,
    };
}