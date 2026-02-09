import { render, screen } from '../../../../mocks/test-utils';
import { LoginAlert } from './LoginAlert';

describe('LoginAlert', () => {
    it('renders nothing if no message is provided', () => {
        const { container } = render(<LoginAlert message={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the Alert with correct message when provided', () => {
        const message = 'Invalid credentials';
        render(<LoginAlert message={message} />);

        // Проверяем содержимое сообщения об ошибке
        expect(screen.getByText(message)).toBeInTheDocument();

        // Проверяем роль Alert
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveClass('MuiAlert-filledError');

        // Проверяем заголовок (переведённый)
        // Примечание: Фактический перевод зависит от конфига i18n в test-utils.
        // Если это реальный перевод, мы ожидаем "Error".
        // Если возвращается ключ, мы можем увидеть ключ.
        // Legacy-тест ожидал 'Error'.
        expect(screen.getByText('Error')).toBeInTheDocument();
    });
});
