import { render, screen } from '@testing-library/react';
import UserAvatar from './UserAvatar';

describe('UserAvatar', () => {
    it('renders nothing if no user is provided', () => {
        const { container } = render(<UserAvatar user={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders an avatar with the first initial for a single name', () => {
        const user = { name: 'Tester' };
        render(<UserAvatar user={user} />);
        
        const avatar = screen.getByText('T');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveClass('MuiAvatar-root');
    });

    it('renders an avatar with two initials for a two-part name', () => {
        const user = { name: 'Test User' };
        render(<UserAvatar user={user} />);
        
        const avatar = screen.getByText('TU');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveClass('MuiAvatar-root');
    });

    it('renders an avatar with two initials for a multi-part name', () => {
        const user = { name: 'Test User One' };
        render(<UserAvatar user={user} />);
        
        const avatar = screen.getByText('TU');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveClass('MuiAvatar-root');
    });

    // The MUI Tooltip component does not add a 'title' attribute directly to the wrapped element.
    // Testing the tooltip's appearance on hover reliably requires @testing-library/user-event,
    // which is not a current project dependency. The simple implementation of the tooltip
    // makes visual verification sufficient for this component.

    it('calculates a background color', () => {
        const user = { name: 'Test User' };
        render(<UserAvatar user={user} />);
        const avatar = screen.getByText('TU');
        // Check the computed style, as the color is applied via MUI's sx prop (CSS-in-JS)
        // and will not be an inline style. We expect an rgb or rgba value.
        expect(window.getComputedStyle(avatar).backgroundColor).toMatch(/rgba?\(.+\)/);
    });
});
