import { render, screen } from '@testing-library/react';
import About from './About';

describe('About Page', () => {
    it('renders the "About page" text', () => {
        render(<About />);
        expect(screen.getByText('About page')).toBeInTheDocument();
    });
});
