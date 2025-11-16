import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import UserTabPage from './UserTabPage';
import { usersService } from '../services/usersService'; // To spy on it
import { http } from 'msw';
import { server } from '../../../mocks/server';

// Mock child components and dependencies
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

vi.mock('@mui/x-data-grid', () => {
    const MockDataGrid = (props) => (
        <div data-testid="mock-datagrid">
            {props.rows.map(row => (
                <div key={row.id}>
                    <span>{row.login}</span>
                    {props.columns.find(c => c.field === 'actions')?.renderCell({ row })}
                </div>
            ))}
        </div>
    );
    return {
        DataGrid: MockDataGrid,
        gridClasses: { columnHeader: '', cell: '', row: '' },
    };
});

// We need to mock UserForm because it's complex and we're not testing it here
vi.mock('../components/user/UserForm', () => ({
    __esModule: true,
    default: ({ onSubmit, defaultValues }) => (
        <form data-testid="mock-user-form" onSubmit={(e) => { e.preventDefault(); onSubmit({ login: 'newuser', name: 'New User', password: 'password' }); }}>
            <button type="submit">Submit</button>
        </form>
    ),
}));


describe('UserTabPage Integration Test', () => {

    it('should render users fetched from the API', async () => {
        render(<UserTabPage />);

        // Initially, it might show a loading state (though our hook is fast)
        // Let's wait for the final state
        expect(await screen.findByText('mockuser1')).toBeInTheDocument();
        expect(screen.getByText('mockuser2')).toBeInTheDocument();
    });

    it('should open a form, create a new user, and update the list', async () => {
        render(<UserTabPage />);
        
        // Wait for initial users to load
        expect(await screen.findByText('mockuser1')).toBeInTheDocument();

        // Click "Add User" button
        const addUserButton = screen.getByRole('button', { name: 'user_management.users.actions.add_user_button' });
        fireEvent.click(addUserButton);

        // Check if the form dialog is open
        expect(await screen.findByTestId('mock-user-form')).toBeInTheDocument();

        // Submit the form
        const submitButton = screen.getByRole('button', { name: 'Submit' });
        fireEvent.click(submitButton);

        // Wait for the dialog to close and the new user to appear in the list
        await waitFor(() => {
            expect(screen.queryByTestId('mock-user-form')).not.toBeInTheDocument();
        });
        expect(await screen.findByText('newuser')).toBeInTheDocument();
    });

    it('should delete a user and remove them from the list', async () => {
        render(<UserTabPage />);

        // Wait for initial users to load and find the delete button for the first user
        const deleteButton = (await screen.findAllByRole('button', { name: /delete/i }))[0];
        fireEvent.click(deleteButton);

        // Check if the confirm dialog is open
        expect(await screen.findByText('user_management.users.delete_dialog.title')).toBeInTheDocument();

        // Click the confirm button using the correct translation key
        const confirmButton = screen.getByRole('button', { name: 'confirm_dialog.confirm' });
        fireEvent.click(confirmButton);

        // Wait for the user to be removed from the list
        await waitFor(() => {
            expect(screen.queryByText('mockuser1')).not.toBeInTheDocument();
        });
        expect(screen.getByText('mockuser2')).toBeInTheDocument();
    });
});
