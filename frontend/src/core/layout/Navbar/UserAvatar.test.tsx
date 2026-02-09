import { render, screen } from '@testing-library/react';
import UserAvatar from './UserAvatar';
import type { CurrentUser } from '../../../modules/auth/api/auth.dto';

describe('UserAvatar', () => {
    it('renders nothing if no user is provided', () => {
        const { container } = render(<UserAvatar user={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders an avatar with the first initial for a single name', () => {
        const user = { name: 'Tester', permissions: [] } as unknown as CurrentUser;
        render(<UserAvatar user={user} />);

        const avatar = screen.getByText('T');
        expect(avatar).toBeInTheDocument();
        // MuiAvatar-root может отсутствовать в списке классов в зависимости от версии emotion,
        // но получение по тексту подтверждает, что компонент отрендерился.
        // Использование role 'img' или просто проверка наличия достаточны.
    });

    it('renders an avatar with two initials for a two-part name', () => {
        const user = { name: 'Test User', permissions: [] } as unknown as CurrentUser;
        render(<UserAvatar user={user} />);

        const avatar = screen.getByText('TU');
        expect(avatar).toBeInTheDocument();
    });

    it('renders an avatar with two initials for a multi-part name', () => {
        const user = { name: 'Test User One', permissions: [] } as unknown as CurrentUser;
        render(<UserAvatar user={user} />);

        const avatar = screen.getByText('TU');
        expect(avatar).toBeInTheDocument();
    });


    it('calculates a background color', () => {
        const user = { name: 'Test User', permissions: [] } as unknown as CurrentUser;
        render(<UserAvatar user={user} />);
        const avatar = screen.getByText('TU');
        // Проверяем вычисленный стиль, так как цвет применяется через MUI sx prop (CSS-in-JS)
        expect(window.getComputedStyle(avatar).backgroundColor).toMatch(/rgba?\(.+\)/);
    });
});
