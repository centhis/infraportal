import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import UserForm from './UserForm';

// Mock the translation hook
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key, // Returns the key itself for testing
    }),
}));

describe('UserForm', () => {
    it('should submit the form with valid data in create mode', async () => {
        const mockOnSubmit = vi.fn();
        render(<UserForm onSubmit={mockOnSubmit} />);

        // Fill out the form
        fireEvent.change(screen.getByLabelText(/user_management.users.form.login/i), { target: { value: 'newuser' } });
        fireEvent.change(screen.getByLabelText(/user_management.users.form.name/i), { target: { value: 'New User Name' } });
        fireEvent.change(screen.getByLabelText(/user_management.users.form.password/i), { target: { value: 'password123' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /user_management.users.form.create_user/i }));

        // Wait for submission and check if onSubmit was called
        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledTimes(1);
            // react-hook-form will call it with the form values
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    login: 'newuser',
                    name: 'New User Name',
                    password: 'password123',
                    is_active: true, // default value
                }),
                expect.anything() // react-hook-form also passes the event
            );
        });
    });

    it('should display validation errors for required fields', async () => {
        const mockOnSubmit = vi.fn();
        render(<UserForm onSubmit={mockOnSubmit} />);

        // Submit the form with empty fields
        fireEvent.click(screen.getByRole('button', { name: /user_management.users.form.create_user/i }));

        // Check for validation messages
        expect(await screen.findByText('Login is required')).toBeInTheDocument();
        expect(screen.getByText('Name is required')).toBeInTheDocument();

        // Check that onSubmit was not called
        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should render with default values in editing mode', () => {
        const mockOnSubmit = vi.fn();
        const defaultValues = {
            login: 'edituser',
            name: 'Edit User Name',
            is_active: false,
            type: 'local', // Добавляем type для теста
        };
        render(<UserForm onSubmit={mockOnSubmit} defaultValues={defaultValues} />);

        // Check if fields are pre-filled
        expect(screen.getByLabelText(/user_management.users.form.login/i)).toHaveValue('edituser');
        expect(screen.getByLabelText(/user_management.users.form.name/i)).toHaveValue('Edit User Name');
        // Password should be empty
        expect(screen.getByLabelText(/user_management.users.form.password/i)).toHaveValue('');
        // Switch should be unchecked
        expect(screen.getByLabelText(/user_management.users.form.is_active/i)).not.toBeChecked();

        // Check for the correct button text
        expect(screen.getByRole('button', { name: /user_management.users.form.save_changes/i })).toBeInTheDocument();
    });

    it('должен блокировать поля login, name и is_active для built_in пользователей', () => {
        const mockOnSubmit = vi.fn();
        const defaultValues = {
            id: 1,
            login: 'admin',
            name: 'Admin User',
            is_active: true,
            type: 'built_in',
        };
        render(<UserForm onSubmit={mockOnSubmit} defaultValues={defaultValues} />);

        // Эти поля должны быть заблокированы
        expect(screen.getByLabelText(/user_management.users.form.login/i)).toBeDisabled();
        expect(screen.getByLabelText(/user_management.users.form.name/i)).toBeDisabled();
        expect(screen.getByLabelText(/user_management.users.form.is_active/i)).toBeDisabled();
        
        // Эти поля должны быть активны
        expect(screen.getByLabelText(/user_management.users.form.password/i)).not.toBeDisabled();
        expect(screen.getByRole('button', { name: /user_management.users.form.save_changes/i })).not.toBeDisabled();
    });
});
