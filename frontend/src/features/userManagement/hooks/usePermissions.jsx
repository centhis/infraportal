import { useEffect, useState, useCallback } from "react";
import { permissionsService } from "../services/permissionsService";

export default function usePermissions() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPermissions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await permissionsService.list();
            setPermissions(data);
        } catch (error) {
            console.error("Failed to fetch permissions", error);
            setPermissions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    return {
        permissions,
        loading,
    };
}
