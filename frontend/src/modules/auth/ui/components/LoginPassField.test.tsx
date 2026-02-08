import React from 'react';
import { render, screen, fireEvent } from '../../../../mocks/test-utils';
import { useForm } from 'react-hook-form';
import { LoginPassField } from './LoginPassField';
import { describe, it, expect } from 'vitest';

// Компонент-обертка для предоставления контекста формы
interface TestFormProps {
    defaultValue?: string;
    error?: { type: string; message: string };
}

const TestForm = ({ defaultValue = '', error }: TestFormProps = {}) => {
    const { control, setError } = useForm({
        defaultValues: { password: defaultValue },
    });

    // Устанавливаем ошибку программно для тестирования
    React.useEffect(() => {
        if (error) {
            setError('password', error);
        }
    }, [error, setError]);

    return (
        <LoginPassField
            label="Password"
            name="password"
            control={control}
        />
    );
};

describe('LoginPassField', () => {
    it('renders the password field with the correct label', () => {
        render(<TestForm />);
        // MUI InputLabel добавляет *, если логика формы требует, но у нас явно не задано.
        // Должно совпадать по тексту лейбла "Password".
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility when the icon is clicked', () => {
        render(<TestForm />);
        const passwordInput = screen.getByLabelText('Password');
        // Кнопка-иконка MUI для видимости обычно имеет aria-label="toggle password visibility"
        const visibilityButton = screen.getByLabelText('toggle password visibility');

        // Изначально пароль скрыт
        expect(passwordInput).toHaveAttribute('type', 'password');

        // Кликаем, чтобы показать
        fireEvent.click(visibilityButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        // Кликаем, чтобы снова скрыть
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
        const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

        fireEvent.change(passwordInput, { target: { value: 'new-password' } });

        expect(passwordInput.value).toBe('new-password');
    });
});
