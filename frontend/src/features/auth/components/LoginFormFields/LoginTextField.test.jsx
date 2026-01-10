import React from 'react';
import { render, screen, fireEvent } from '../../../../mocks/test-utils';
import { useForm } from 'react-hook-form';
import LoginTextField from './LoginTextField';

// A wrapper component to provide the form context
const TestForm = ({ defaultValue = '', error = null }) => {
    const { control, setError } = useForm({
        defaultValues: { username: defaultValue },
    });

    // Set error programmatically for testing
    React.useEffect(() => {
        if (error) {
            setError('username', error);
        }
    }, [error, setError]);

    return (
        <LoginTextField label="Username" name="username" control={control} />
    );
};

describe('LoginTextField', () => {
    it('renders the text field with the correct label', () => {
        render(<TestForm />);
        expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('displays an error message when there is a field error', () => {
        const error = { type: 'required', message: 'Username is required' };
        render(<TestForm error={error} />);
        expect(screen.getByText('Username is required')).toBeInTheDocument();
    });

    it('updates its value on change', () => {
        render(<TestForm />);
        const textField = screen.getByLabelText('Username');
        
        fireEvent.change(textField, { target: { value: 'new-username' } });
        
        expect(textField.value).toBe('new-username');
    });

    it('displays the default value', () => {
        render(<TestForm defaultValue="initial_user" />);
        expect(screen.getByLabelText('Username')).toHaveValue('initial_user');
    });
});
