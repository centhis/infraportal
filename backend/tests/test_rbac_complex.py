from app.users.models import Group, Permission, Role, User
from app.users.permissions.services import PermissionService


def test_unified_permissions_multiple_groups(db_session):
    # Setup: Create permissions, roles, groups and a user
    service = PermissionService(db_session)
    p1 = Permission(name="res1:read", description="r1")
    p2 = Permission(name="res2:write", description="r2")
    db_session.add_all([p1, p2])
    db_session.commit()

    r1 = Role(name="Role1", description="r1")
    r1.permissions.append(p1)

    r2 = Role(name="Role2", description="r2")
    r2.permissions.append(p2)
    db_session.add_all([r1, r2])
    db_session.commit()

    g1 = Group(name="Group1")
    g1.roles.append(r1)

    g2 = Group(name="Group2")
    g2.roles.append(r2)
    db_session.add_all([g1, g2])
    db_session.commit()

    user = User(login="complex_user", name="Complex", type="local", is_active=True)
    user.groups.extend([g1, g2])
    db_session.add(user)
    db_session.commit()

    # Verify unified permissions
    perms = service.get_user_permissions(user.id)
    assert "res1:read" in perms
    assert "res2:write" in perms
    assert len(perms) == 2


def test_permission_deduplication(db_session):
    # Setup: User in two groups that both point to the same role/permission
    service = PermissionService(db_session)
    p1 = Permission(name="common:perm")
    r1 = Role(name="CommonRole")
    r1.permissions.append(p1)

    g1 = Group(name="G1")
    g1.roles.append(r1)

    g2 = Group(name="G2")
    g2.roles.append(r1)

    user = User(login="dup_user", name="Dup", type="local", is_active=True)
    user.groups.extend([g1, g2])
    db_session.add_all([p1, r1, g1, g2, user])
    db_session.commit()

    perms = service.get_user_permissions(user.id)
    assert perms == ["common:perm"]
    assert len(perms) == 1
