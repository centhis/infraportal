// Экспорт API
export { usersApi } from './api/users.api';
export { rolesApi } from './api/roles.api';
export { groupsApi } from './api/groups.api';
export { permissionsApi } from './api/permissions.api';

// DTO типы
export type {
    User,
    UserType,
    UserCreate,
    UserUpdate,
    UsersListParams,
    UsersPaginatedResponse,
    Role,
    RoleCreate,
    RoleUpdate,
    RolesListParams,
    RolesPaginatedResponse,
    Group,
    GroupCreate,
    GroupUpdate,
    GroupsListParams,
    GroupsPaginatedResponse,
    Permission,
    PermissionCreate,
    PermissionsPaginatedResponse,
} from './api/users.dto';

// Хуки
export {
    useUsers,
    useUser,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    USERS_QUERY_KEY,
} from './ui/hooks/useUsers';

export {
    useRoles,
    useRole,
    useCreateRole,
    useUpdateRole,
    useDeleteRole,
    ROLES_QUERY_KEY,
} from './ui/hooks/useRoles';

export {
    useGroups,
    useGroup,
    useCreateGroup,
    useUpdateGroup,
    useDeleteGroup,
    GROUPS_QUERY_KEY,
} from './ui/hooks/useGroups';

export { usePermissionsList, PERMISSIONS_QUERY_KEY } from './ui/hooks/usePermissionsList';

// Страницы
export { UserManagementPage } from './ui/pages/UserManagementPage';
export { UserTabPage } from './ui/pages/UserTabPage';
export { RoleTabPage } from './ui/pages/RoleTabPage';
export { GroupTabPage } from './ui/pages/GroupTabPage';

// Маршруты
export { usersRoutes } from './routes';

