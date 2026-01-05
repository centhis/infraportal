let users = [
    {id: 1, login: "admin", name: "Admin", isActive: "True", auth_type: "local", created_at: "2025-10-04 23:23:20.568 +0800" }
]

export const usersMock = {
    async list() {
        return users;
    },
    async create(user) {
        const newUser = { id: Date.now(), ...user };
        users.push(newUser);
        return newUser;
    },
    async update(id, updateUser) {
        users = users.map(u => (u.id === id ? { ...u, ...updateUser } : u));
        return users.find(u => u.id === id);
    },
    async remove(id) {
        users = users.filter(u => u.id !== id);
        return true;
    },
};