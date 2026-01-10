import { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../../features/auth/hooks/useAuth'; // Импортируем useAuth

// Создаем контекст для разрешений
const PermissionsContext = createContext(null);

/**
 * Провайдер разрешений, который предоставляет список разрешений и компонент Can.
 * @param {object} props - Свойства компонента.
 * @param {React.ReactNode} props.children - Дочерние элементы.
 */
export const PermissionsProvider = ({ children }) => {
    const { permissions, loading } = useAuth();

    // Мемоизируем значение контекста, чтобы избежать лишних ререндеров
    const contextValue = useMemo(() => ({ permissions, loading }), [permissions, loading]);

    return (
        <PermissionsContext.Provider value={contextValue}>
            {children}
        </PermissionsContext.Provider>
    );
};

/**
 * Хук для доступа к разрешениям и функциям проверки.
 * @returns {{permissions: string[], loading: boolean, can: (requiredPermissions: string|string[]) => boolean}}
 */
export const usePermissions = () => {
    const context = useContext(PermissionsContext);
    if (!context) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }

    const { permissions, loading } = context;

    const can = (requiredPermissions) => {
        if (loading) {
            return false; // Пока разрешения загружаются, считаем, что доступа нет
        }
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true; // Если разрешения не требуются, то доступ есть
        }

        const checkPermission = (perm) => permissions.includes(perm);

        if (typeof requiredPermissions === 'string') {
            return checkPermission(requiredPermissions);
        }

        if (Array.isArray(requiredPermissions)) {
            return requiredPermissions.some(checkPermission); // Логика OR: хотя бы одно разрешение
        }
        return false;
    };

    return { permissions, loading, can };
};

/**
 * Компонент для условного рендеринга дочерних элементов на основе разрешений пользователя.
 * @param {object} props - Свойства компонента.
 * @param {string|string[]} props.do - Разрешение или массив разрешений, необходимых для отображения.
 *                                     Если массив, то требуется наличие хотя бы одного разрешения (логика OR).
 * @param {React.ReactNode} props.children - Дочерние элементы, которые будут рендериться, если разрешения есть.
 * @param {React.ReactNode} [props.fallback=null] - Элемент, который будет рендериться, если разрешений нет.
 * @returns {React.ReactNode|null} Отрендеренные дочерние элементы или null, если разрешений нет.
 */
export const Can = ({ do: requiredPermissions, children, fallback = null }) => {
    const { can, loading } = usePermissions();

    if (loading) {
        return null;
    }

    return can(requiredPermissions) ? children : fallback;
};
