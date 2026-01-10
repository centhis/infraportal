import { screen } from '@testing-library/react';
import LoginAlert from './LoginAlert';
import { render } from '../../../mocks/test-utils'; // Import render from test-utils

// Mock the child component
vi.mock('../../../components/forms/IpAlert', () => 
    ({ default: ({ text, severity, title }) => (
        <div data-testid="ip-alert">
            <span>{title}</span>
            <span>{severity}</span>
            <span>{text}</span>
        </div>
    )})
);

describe('LoginAlert', () => {
    it('renders nothing if no message is provided', () => {
        const { container } = render(
            <LoginAlert message={null} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the IpAlert with correct props when a message is provided', () => {
        const message = 'Invalid credentials';
        render(
            <LoginAlert message={message} />
        );

        const alert = screen.getByTestId('ip-alert');
        expect(alert).toBeInTheDocument();
        
        // It uses t("alert_message.error") for title
        // In our en/common.json, this is "Error"
        expect(screen.getByText('Error')).toBeInTheDocument(); 
        expect(screen.getByText('error')).toBeInTheDocument(); // severity
        expect(screen.getByText(message)).toBeInTheDocument(); // text
    });
});
