import { useEffect, useState, useCallback } from "react";

import { usersService } from "../services/usersService";
import usePersistentState from "./usePersistentState";

export default function useUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginationModel, setPaginationModel] = usePersistentState('user-pagination-model', { page: 0, pageSize: 10 });
    const [rowCount, setRowCount] = useState(0);

    const refetchUsers = useCallback(async () => {
        setLoading(true);
        const { page, pageSize } = paginationModel;
        const params = { skip: page * pageSize, limit: pageSize };
        const data = await usersService.list(params);
        setUsers(data.users);
        setRowCount(data.total);
        setLoading(false);
    }, [paginationModel]);

    const createUser = async (user) => {
        const newUser = await usersService.create(user);
        setUsers(prev => [...prev, newUser]);
        setRowCount(prev => prev + 1); // Optimistically update row count
    };

    const updateUser = async (id, updateUser) => {
        const newUser = await usersService.update(id, updateUser);
        setUsers(prev => prev.map(u => (u.id === id ? newUser: u)));
    };

    const deleteUser = async (id) => {
        await usersService.remove(id);
        setUsers(prev => prev.filter(u => u.id !== id));
        setRowCount(prev => prev - 1); // Optimistically update row count
    };

    useEffect(() => {
        refetchUsers();
    }, [refetchUsers]);

    return {
        users,
        loading,
        paginationModel,
        setPaginationModel,
        rowCount,
        refetchUsers,
        createUser,
        updateUser,
        deleteUser,
    };
}