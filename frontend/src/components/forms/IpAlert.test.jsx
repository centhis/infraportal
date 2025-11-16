import React from 'react';
import { render, screen } from '@testing-library/react';
import IpAlert from './IpAlert';

describe('IpAlert', () => {
    it('should render with only text', () => {
        const text = 'This is an alert message.';
        render(<IpAlert text={text} />);

        expect(screen.getByText(text)).toBeInTheDocument();
        expect(screen.queryByRole('heading')).not.toBeInTheDocument(); // AlertTitle renders as a heading
    });

    it('should render with text and title', () => {
        const text = 'This is an alert message.';
        const title = 'Alert Title';
        render(<IpAlert text={text} title={title} />);

        expect(screen.getByText(text)).toBeInTheDocument();
        expect(screen.getByText(title)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    });

    it('should render with specified severity', () => {
        const text = 'Error message.';
        const severity = 'error';
        render(<IpAlert text={text} severity={severity} />);

        const alertElement = screen.getByRole('alert');
        expect(alertElement).toBeInTheDocument();
        expect(alertElement).toHaveClass(`MuiAlert-standardError`); // Expect standard variant
        expect(alertElement).toHaveAttribute('class', expect.stringContaining(`MuiAlert-standard${severity.charAt(0).toUpperCase() + severity.slice(1)}`));
    });

    it('should render with default severity if not specified', () => {
        const text = 'Info message.';
        render(<IpAlert text={text} />);

        const alertElement = screen.getByRole('alert');
        expect(alertElement).toBeInTheDocument();
        // Default severity for MUI Alert is 'success' when not specified
        expect(alertElement).toHaveClass('MuiAlert-standardSuccess');
    });
});
