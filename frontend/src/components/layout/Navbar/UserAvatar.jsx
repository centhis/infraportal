import { Avatar, Tooltip } from "@mui/material";

export default function UserAvatar({ user }) {

  if (!user) return null;

  const stringToColor = (string) => {
    if (!string) return "#607d8b";
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 60%)`;
    return color;
  };

  // Первые буквы имени
  const stringAvatar = (name) => {
    const parts = name.split(" ");
    const initials = parts.length === 1
      ? parts[0][0]
      : parts[0][0] + parts[1][0];
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