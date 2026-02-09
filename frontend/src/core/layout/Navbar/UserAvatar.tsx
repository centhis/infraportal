import { Avatar, Tooltip } from "@mui/material";
import type { CurrentUser } from '../../../modules/auth/api/auth.dto';

interface UserAvatarProps {
    user?: CurrentUser | null;
}

export default function UserAvatar({ user }: UserAvatarProps) {

    if (!user) return null;

    const stringToColor = (string: string) => {
        if (!string) return "#607d8b";
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            hash = string.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = `hsl(${hash % 360}, 70%, 60%)`;
        return color;
    };

    // Первые буквы имени
    const stringAvatar = (name: string) => {
        const parts = name.split(" ");
        if (parts.length === 0) return '';

        // Проверка безопасности на доступность частей имени
        const firstInitial = parts[0]?.charAt(0) || '';
        const secondInitial = (parts[1] && parts[1]?.charAt(0)) || '';

        const initials = parts.length === 1
            ? firstInitial
            : firstInitial + secondInitial;
        return initials.toUpperCase();
    };

    return (
        <Tooltip title={`${user.name}`}>
            <Avatar
                sx={{
                    width: 36,
                    height: 36,
                    fontSize: 15,
                    fontWeight: 500,
                    bgcolor: stringToColor(user.name),
                    color: "#fff",
                    textTransform: "uppercase",
                }}
            >
                {stringAvatar(user.name)}
            </Avatar>
        </Tooltip>
    );
}
