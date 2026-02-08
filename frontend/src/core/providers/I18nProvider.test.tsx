import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { I18nProvider, useI18n } from './I18nProvider';
import i18n from '../../i18n/i18n';
import { I18N_LNG_KEY } from '../../shared/constants/keys';

// Тестовый компонент для использования контекста
const TestComponent = () => {
    const { currentLanguage, changeLanguage } = useI18n();
    return (
        <div>
            <span data-testid="language-display">{currentLanguage}</span>
            <button onClick={() => changeLanguage('de')}>Change to DE</button>
            <button onClick={() => changeLanguage('fr')}>Change to FR</button>
        </div>
    );
};

describe('I18nProvider', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Сбрасываем localStorage
        window.localStorage.clear();

        // Сбрасываем i18n на 'en'
        act(() => {
            i18n.changeLanguage('en');
        });

        // Мокаем реализацию changeLanguage для шпиона без побочных эффектов при необходимости,
        // но здесь мы предпочитаем реальное поведение, просто отслеживаем вызовы.
        // Если нужно тестировать "инициализацию из storage", нужно убедиться, что i18n действительно меняется.
        // Будем шпионить.
        vi.spyOn(i18n, 'changeLanguage');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render children and provide default language', async () => {
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );
        // Ждём возможной асинхронной инициализации
        await waitFor(() => {
            expect(screen.getByTestId('language-display')).toHaveTextContent('en');
        });
    });

    it('should initialize with language from localStorage if present', async () => {
        window.localStorage.setItem(I18N_LNG_KEY, 'ru');

        // Нужно перерендерить для срабатывания useEffect
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );

        await waitFor(() => {
            expect(i18n.changeLanguage).toHaveBeenCalledWith('ru');
        });

        // Опционально проверяем, обновилось ли состояние
        await waitFor(() => {
            expect(screen.getByTestId('language-display')).toHaveTextContent('ru');
        });
    });

    it('should call i18n.changeLanguage when context function is used', async () => {
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );

        fireEvent.click(screen.getByText('Change to DE'));

        await waitFor(() => {
            expect(i18n.changeLanguage).toHaveBeenCalledWith('de');
        });
    });

    it('should update context and localStorage when language changes', async () => {
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );

        expect(screen.getByTestId('language-display')).toHaveTextContent('en');

        fireEvent.click(screen.getByText('Change to FR'));

        await waitFor(() => {
            expect(screen.getByTestId('language-display')).toHaveTextContent('fr');
        });

        expect(window.localStorage.getItem(I18N_LNG_KEY)).toBe('fr');
    });
});
