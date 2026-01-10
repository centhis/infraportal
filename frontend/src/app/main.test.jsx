import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter as Router } from 'react-router-dom';
import { StrictMode } from 'react';

// Mock the App component
vi.mock('./App.jsx', () => ({ default: () => <div data-testid="mock-app"></div> }));


describe('main.jsx', () => {
    let rootElement;
    let renderMock;

    beforeEach(async () => {
        vi.resetModules(); // Clear the module cache for main.jsx

        // Mock react-dom/client *after* vi.resetModules()
        vi.mock('react-dom/client', () => ({
            createRoot: vi.fn(),
        }));
        // Mock react-router-dom's BrowserRouter *after* vi.resetModules()
        vi.mock('react-router-dom', async () => {
            const actual = await vi.importActual('react-router-dom');
            return {
                ...actual,
                BrowserRouter: ({ children }) => <div data-testid="mock-router">{children}</div>,
            };
        });

        // Clear mocks before each test
        vi.clearAllMocks();

        // Create a div to be the root element
        rootElement = document.createElement('div');
        rootElement.id = 'root';
        document.body.appendChild(rootElement);

        renderMock = vi.fn();
        createRoot.mockReturnValue({ render: renderMock });

        // Dynamically import main.jsx to ensure its side effects run
        await import('./main.jsx'); // Await the import to ensure side effects are processed
    });

    afterEach(() => {
        document.body.removeChild(rootElement);
    });

    it('should call createRoot with the #root element and render the App component', async () => {
        // Assert that createRoot was called with the correct element
        expect(createRoot).toHaveBeenCalledWith(rootElement);

        // Assert that render was called
        expect(renderMock).toHaveBeenCalledTimes(1);
        
        // Optionally, you can deeply check what was rendered
        // This part might be tricky due to React element comparison,
        // but we can check the type of the element being rendered.
        // The render method receives a React element, which is an object.
        const renderedElement = renderMock.mock.calls[0][0];
        expect(renderedElement.type).toBe(Router); // The top-level component rendered is Router
        expect(renderedElement.props.children.type).toBe(StrictMode); // Inside Router is StrictMode
        expect(renderedElement.props.children.props.children.type).toBe(App); // Inside StrictMode is App
    });
});
