import logging

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions_registry import DISCOVERED_PERMISSIONS, autodiscover_permissions
from app.core.security import hash_password
from app.users.models import (
    Group,
    Permission,
    Role,
    User,
    group_role_association,
    role_permission_association,
    user_group_association,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_data(db: Session):
    # Создать или обновить администратора по умолчанию
    admin_user = db.query(User).filter(User.login == settings.DEFAULT_ADMIN_USER).first()
    if not admin_user:
        logger.info("Creating default admin user")
        new_admin = User(
            login=settings.DEFAULT_ADMIN_USER,
            password=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
            name=settings.DEFAULT_ADMIN_USER,
            type="built_in",
            is_active=True,
        )
        db.add(new_admin)
        db.flush()  # Сбросить, чтобы получить ID для отношений
        admin_user = new_admin
    else:
        logger.info("Default admin user found")
        if admin_user.type != "built_in":
            logger.info("Updating default admin user type to 'built_in'")
            admin_user.type = "built_in"

    # Создать или получить группу 'admins'
    admins_group = db.query(Group).filter(Group.name == "admins").first()
    if not admins_group:
        logger.info("Creating 'admins' group")
        admins_group = Group(name="admins", description="Administrators group", built_in=True)
        db.add(admins_group)
        db.flush()  # Сбросить, чтобы получить ID для отношений
    else:
        logger.info("'admins' group found")
        if not admins_group.built_in:
            logger.info("Updating 'admins' group built_in flag to True")
            admins_group.built_in = True

    # Создать или получить роль 'admin'
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        logger.info("Creating 'admin' role")
        admin_role = Role(
            name="admin", description="Administrator role with full permissions", built_in=True
        )
        db.add(admin_role)
        db.flush()  # Сбросить, чтобы получить ID для отношений
    else:
        logger.info("'admin' role found")
        if not admin_role.built_in:
            logger.info("Updating 'admin' role built_in flag to True")
            admin_role.built_in = True

    db.commit()  # Зафиксировать сущности перед созданием ассоциаций

    # 0. Автообнаружение разрешений
    autodiscover_permissions("app")

    # Создать разрешения
    permissions_to_create = DISCOVERED_PERMISSIONS
    for perm_data in permissions_to_create:
        permission = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
        if not permission:
            logger.info(f"Creating permission: {perm_data['name']}")
            permission = Permission(**perm_data, built_in=True)
            db.add(permission)
            db.flush()
        else:
            logger.info(f"Permission '{perm_data['name']}' found")
            if not permission.built_in:
                logger.info(f"Updating permission '{perm_data['name']}' built_in flag to True")
                permission.built_in = True

    db.commit()  # Зафиксировать разрешения перед их назначением

    # Назначить все разрешения роли администратора
    all_permissions = db.query(Permission).all()
    for permission in all_permissions:
        stmt = select(role_permission_association).where(
            role_permission_association.c.role_id == admin_role.id,
            role_permission_association.c.permission_id == permission.id,
        )
        existing_association = db.execute(stmt).first()
        if not existing_association:
            db.execute(
                insert(role_permission_association).values(
                    role_id=admin_role.id, permission_id=permission.id, built_in=True
                )
            )
        else:
            if not existing_association.built_in:
                db.execute(
                    role_permission_association.update()
                    .where(role_permission_association.c.role_id == admin_role.id)
                    .where(role_permission_association.c.permission_id == permission.id)
                    .values(built_in=True)
                )

    # Назначить роль 'admin' группе 'admins' (ассоциация)
    stmt = select(group_role_association).where(
        group_role_association.c.group_id == admins_group.id,
        group_role_association.c.role_id == admin_role.id,
    )
    existing_association = db.execute(stmt).first()
    if not existing_association:
        db.execute(
            insert(group_role_association).values(
                group_id=admins_group.id, role_id=admin_role.id, built_in=True
            )
        )
    else:
        if not existing_association.built_in:
            db.execute(
                group_role_association.update()
                .where(group_role_association.c.group_id == admins_group.id)
                .where(group_role_association.c.role_id == admin_role.id)
                .values(built_in=True)
            )

    # Назначить группу 'admins' администратору по умолчанию (ассоциация)
    stmt = select(user_group_association).where(
        user_group_association.c.user_id == admin_user.id,
        user_group_association.c.group_id == admins_group.id,
    )
    existing_association = db.execute(stmt).first()
    if not existing_association:
        db.execute(
            insert(user_group_association).values(
                user_id=admin_user.id, group_id=admins_group.id, built_in=True
            )
        )
    else:
        if not existing_association.built_in:
            db.execute(
                user_group_association.update()
                .where(user_group_association.c.user_id == admin_user.id)
                .where(user_group_association.c.group_id == admins_group.id)
                .values(built_in=True)
            )

    db.commit()
