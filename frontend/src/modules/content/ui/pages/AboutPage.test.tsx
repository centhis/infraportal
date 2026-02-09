import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AboutPage } from './AboutPage';
import { render } from '../../../../mocks/test-utils';

describe('AboutPage', () => {
    it('renders the "About page" text', () => {
        render(<AboutPage />);
        // Перевод "common" для "pages.about.title" по умолчанию "About"
        // в AboutPage.tsx: {t('pages.about.title', 'About')}
        expect(screen.getByText('About')).toBeInTheDocument();
        // и описание
        expect(screen.getByText('InfraPortal is a comprehensive infrastructure management platform.')).toBeInTheDocument();
    });
});
