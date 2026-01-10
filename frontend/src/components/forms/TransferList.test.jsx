import { render, screen, fireEvent, within } from '../../mocks/test-utils';
import { vi } from 'vitest';
import TransferList from './TransferList';

describe('TransferList', () => {
    const mockItems = [
        { id: 1, name: 'users:view' },
        { id: 2, name: 'users:create' },
        { id: 3, name: 'items:view' },
        { id: 4, name: 'items:create' },
    ];

    const mockOnChange = vi.fn();

    const defaultProps = {
        allItems: mockItems,
        selectedIds: [],
        onChange: mockOnChange,
        itemType: 'permission',
        disabled: false,
        disabledItemsIds: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render available and assigned lists', () => {
        render(<TransferList {...defaultProps} selectedIds={[1]} />);
        
        expect(screen.getByTestId('transfer-list-available')).toBeInTheDocument();
        expect(screen.getByTestId('transfer-list-assigned')).toBeInTheDocument();

        // Check if items are in the correct lists
        const availableList = screen.getByTestId('transfer-list-available');
        const assignedList = screen.getByTestId('transfer-list-assigned');

        expect(within(availableList).getByText('users:create')).toBeInTheDocument();
        expect(within(assignedList).getByText('users:view')).toBeInTheDocument();
    });

    it('should move an item from available to assigned on click', () => {
        render(<TransferList {...defaultProps} selectedIds={[1]} />);
        fireEvent.click(screen.getByText('users:create'));
        expect(mockOnChange).toHaveBeenCalledWith(expect.arrayContaining([1, 2]));
    });

    it('should move an item from assigned to available on click', () => {
        render(<TransferList {...defaultProps} selectedIds={[1, 2]} />);
        fireEvent.click(screen.getByText('users:create'));
        expect(mockOnChange).toHaveBeenCalledWith([1]); // Only users:view should remain
    });

    it('should filter items in both lists', () => {
        render(<TransferList {...defaultProps} selectedIds={[3]} />);
        // The filter input is a TextField, and its label is the title of the list.
        fireEvent.change(screen.getByLabelText('Available'), { target: { value: 'create' } });

        // users:create should be visible in available
        expect(screen.getByText('users:create')).toBeInTheDocument();
        // users:view should not be visible as it doesn't match the filter
        expect(screen.queryByText('users:view')).not.toBeInTheDocument();
        // items:create should be visible in the available list as well
        expect(screen.getByText('items:create')).toBeInTheDocument();
    });

    describe('Business Logic: Automatic Permission Assignment', () => {
        it('should automatically assign "users:view" when another "users:*" permission is assigned', () => {
            render(<TransferList {...defaultProps} selectedIds={[]} />);
            fireEvent.click(screen.getByText('users:create'));
            // Expect both users:create (2) and users:view (1) to be in the new selection
            expect(mockOnChange).toHaveBeenCalledWith(expect.arrayContaining([1, 2]));
        });

        it('should not remove "users:view" if other "users:*" permissions are still assigned', () => {
            render(<TransferList {...defaultProps} selectedIds={[1, 2, 3]} />); // users:view, users:create, items:view
            fireEvent.click(screen.getByText('users:view')); // Attempt to remove users:view
            // onChange should not be called because users:create still requires users:view
            expect(mockOnChange).not.toHaveBeenCalled();
        });

        it('should allow removing "users:view" if no other "users:*" permissions are assigned', () => {
            render(<TransferList {...defaultProps} selectedIds={[1, 3]} />); // users:view, items:view
            fireEvent.click(screen.getByText('users:view'));
            // users:view (1) should be removed, leaving only items:view (3)
            expect(mockOnChange).toHaveBeenCalledWith([3]);
        });
    });

    describe('Disabled State', () => {
        it('should not allow moving a disabled item', () => {
            render(<TransferList {...defaultProps} selectedIds={[]} disabledItemsIds={[2]} />);
            const disabledItemChip = screen.getByTestId('chip-users:create');

            // Attempting to click should not trigger onChange
            fireEvent.click(disabledItemChip);
            expect(mockOnChange).not.toHaveBeenCalled();
        });
    });
});
