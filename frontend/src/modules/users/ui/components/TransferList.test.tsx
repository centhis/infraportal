import { render, screen, fireEvent, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TransferList, type TransferListProps, type TransferListItem } from './TransferList';

describe('TransferList', () => {
    const mockItems: TransferListItem[] = [
        { id: 1, name: 'users:view', description: 'View users' },
        { id: 2, name: 'users:create', description: 'Create users' },
        { id: 3, name: 'items:view', description: 'View items' },
        { id: 4, name: 'items:create', description: 'Create items' },
    ];

    const mockOnChange = vi.fn();

    const defaultProps: TransferListProps = {
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

        // Проверяем, что элементы в правильных списках
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
        expect(mockOnChange).toHaveBeenCalledWith([1]); // Должен остаться только users:view
    });

    it('should filter items in both lists', () => {
        render(<TransferList {...defaultProps} selectedIds={[3]} />);
        // Поле фильтра - это TextField, и его label - это заголовок списка.
        // В новом компоненте заголовки - это ключи 'transfer_list.available' и 'transfer_list.assigned'.
        // Так как test-utils загружает реальные переводы, нам может потребоваться проверить реальный текст или использовать Test ID для input, если лейблы сложно предсказать
        // Но легаси тест использовал getByLabelText('Available'), предполагая, что английский перевод был загружен.
        // Наш обновленный test-utils использует en перевод, так что 'Available' и 'Assigned' должны быть, если они есть в common.json.

        // Предположим, что common.json имеет "transfer_list.available": "Available"
        // Если нет, мы можем упасть здесь. Но давайте проверим common.json или используем более безопасный селектор.
        // Безопаснее: искать inputs внутри карточек.

        const availableCard = screen.getByTestId('transfer-list-available');
        const searchInput = within(availableCard).getByRole('textbox'); // TextField инпут

        fireEvent.change(searchInput, { target: { value: 'create' } });

        // users:create должен быть виден в доступных
        expect(screen.getByText('users:create')).toBeInTheDocument();
        // users:view не должен быть виден, так как не соответствует фильтру
        expect(screen.queryByText('users:view')).not.toBeInTheDocument();
        // items:create должен быть виден в доступном списке также
        expect(screen.getByText('items:create')).toBeInTheDocument();
    });

    describe('Business Logic: Automatic Permission Assignment', () => {
        it('should automatically assign "users:view" when another "users:*" permission is assigned', () => {
            render(<TransferList {...defaultProps} selectedIds={[]} />);
            fireEvent.click(screen.getByText('users:create'));
            // Ожидаем, что и users:create (2), и users:view (1) будут в новой выборке
            expect(mockOnChange).toHaveBeenCalledWith(expect.arrayContaining([1, 2]));
            // Реализация добавляет users:view, если его нет.
            // мок реализации: newSelectedIds = [...selectedIds, item.id] -> [2]. Затем добавляет view -> [2, 1] или [1, 2]? логика: push(view).
            // Так что ожидаем [2, 1]. arrayContaining обрабатывает независимость от порядка.
        });

        it('should not remove "users:view" if other "users:*" permissions are still assigned', () => {
            render(<TransferList {...defaultProps} selectedIds={[1, 2, 3]} />); // users:view, users:create, items:view (перечисления ключей)
            fireEvent.click(screen.getByText('users:view')); // Пытаемся удалить users:view
            // onChange не должен быть вызван, потому что users:create всё ещё требует users:view
            expect(mockOnChange).not.toHaveBeenCalled();
        });

        it('should allow removing "users:view" if no other "users:*" permissions are assigned', () => {
            render(<TransferList {...defaultProps} selectedIds={[1, 3]} />); // users:view, items:view (перечисления ключей)
            fireEvent.click(screen.getByText('users:view'));
            // users:view (1) должен быть удален, останется только items:view (3)
            expect(mockOnChange).toHaveBeenCalledWith([3]);
        });
    });

    describe('Disabled State', () => {
        it('should not allow moving a disabled item', () => {
            render(<TransferList {...defaultProps} selectedIds={[]} disabledItemsIds={[2]} />);
            const disabledItemChip = screen.getByTestId('chip-users:create');

            // В MUI Chip сломанные клик-события на отключенных элементах могут быть сложными.
            // Реализация компонента оборачивает Chip в span для Tooltip.
            // Сам Chip отключен.
            // fireEvent.click на отключенном элементе может не сработать в JSDOM или не вызвать обработчик.

            fireEvent.click(disabledItemChip);
            expect(mockOnChange).not.toHaveBeenCalled();
        });
    });
});
