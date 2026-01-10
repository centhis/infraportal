import React from 'react';
import { render, screen, fireEvent } from '../../../../mocks/test-utils';
import { useForm } from 'react-hook-form';
import LoginPassField from './LoginPassField';

// A wrapper component to provide the form context
const TestForm = ({ defaultValue = '', error = null }) => {
    const { control, setError } = useForm({
        defaultValues: { password: defaultValue },
    });

    // Set error programmatically for testing
    React.useEffect(() => {
        if (error) {
            setError('password', error);
        }
    }, [error, setError]);

    return (
        <LoginPassField label="Password" name="password" control={control} />
    );
};

describe('LoginPassField', () => {
    it('renders the password field with the correct label', () => {
        render(<TestForm />);
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility when the icon is clicked', () => {
        render(<TestForm />);
        const passwordInput = screen.getByLabelText('Password');
        const visibilityButton = screen.getByRole('button');

        // Initially password
        expect(passwordInput).toHaveAttribute('type', 'password');

        // Click to show
        fireEvent.click(visibilityButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        // Click to hide again
        fireEvent.click(visibilityButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('displays an error message when there is a field error', () => {
        const error = { type: 'required', message: 'Password is required' };
        render(<TestForm error={error} />);
        expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    it('updates its value on change', () => {
        render(<TestForm />);
        const passwordInput = screen.getByLabelText('Password');
        
        fireEvent.change(passwordInput, { target: { value: 'new-password' } });
        
        expect(passwordInput.value).toBe('new-password');
    });
});
