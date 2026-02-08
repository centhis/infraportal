import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomePage } from './HomePage';
import { render } from '../../../../mocks/test-utils';

describe('HomePage', () => {
    it('renders the "Home page" content', () => {
        render(<HomePage />);
        // Проверка перевода "common"
        // t('pages.home.title', 'Welcome') (заголовок страницы)
        expect(screen.getByText('Welcome')).toBeInTheDocument();
        // t('pages.home.description') (описание страницы)
        expect(screen.getByText('InfraPortal - Infrastructure Management System')).toBeInTheDocument();
    });
});
