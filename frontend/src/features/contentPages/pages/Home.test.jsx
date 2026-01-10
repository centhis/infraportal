import { render, screen } from '@testing-library/react';
import Home from './Home';

describe('Home Page', () => {
    it('renders the "Home page" text', () => {
        render(<Home />);
        expect(screen.getByText('Home page')).toBeInTheDocument();
    });
});
