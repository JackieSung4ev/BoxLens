import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('./components/Scene', () => ({
  Scene: ({
    artwork,
    faceAppearance,
    settings,
  }: {
    artwork?: { front?: { url: string }; back?: { url: string } };
    faceAppearance?: { front?: { color: string; mode: string } };
    settings?: { shadows: boolean; surface: string };
  }) => (
    <div
      data-back-artwork={artwork?.back?.url}
      data-front-artwork={artwork?.front?.url}
      data-front-color={faceAppearance?.front?.color}
      data-front-mode={faceAppearance?.front?.mode}
      data-shadows={settings?.shadows ? 'on' : 'off'}
      data-surface={settings?.surface}
      data-testid="scene-preview"
    >
      3D preview
    </div>
  ),
}));

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the BoxLens workspace without visible upload buttons', () => {
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: 'BoxLens' })).toBeInTheDocument();
    expect(screen.getByText('Real-time 3D packaging mockup generator')).toBeInTheDocument();
    expect(screen.getByLabelText('Width in mm')).toHaveValue(120);
    expect(screen.getByLabelText('Height in mm')).toHaveValue(180);
    expect(screen.getByLabelText('Depth in mm')).toHaveValue(60);

    for (const side of ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom']) {
      expect(screen.getByText(side)).toBeInTheDocument();
    }

    expect(screen.getByText('Primary view')).toBeInTheDocument();
    expect(screen.getAllByText('Drop artwork')).toHaveLength(6);
    expect(container.innerHTML).not.toContain('bg-gradient-to-br');
    expect(container.innerHTML).not.toContain('shadow-[0_8px_28px');
    expect(container.innerHTML).toContain('grid-cols-[88px_minmax(0,1fr)] items-end');
    expect(screen.getByLabelText('Environment lighting')).not.toBeChecked();
    expect(screen.getByLabelText('Shadows')).not.toBeChecked();
    expect(screen.getByLabelText('Surface')).toHaveValue('none');
    expect(screen.getByLabelText('Side artwork rotation')).toHaveValue('none');
    expect(screen.getByLabelText('Lighting preset')).toHaveValue('softbox');
    expect(screen.getByLabelText('Light intensity')).toHaveValue('1');
    expect(screen.getByLabelText('Light direction')).toHaveValue('frontRight');
    expect(screen.getByRole('button', { name: /export png/i })).toBeDisabled();
    expect(screen.queryByText('Upload')).not.toBeInTheDocument();
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-shadows', 'off');
  });

  it('auto-assigns dropped artwork files by side name', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((file: File) => `blob:${file.name}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    render(<App />);

    fireEvent.drop(screen.getByRole('region', { name: 'Artwork' }), {
      dataTransfer: {
        files: [
          new File(['front'], 'front-panel.png', { type: 'image/png' }),
          new File(['back'], '背面.jpg', { type: 'image/jpeg' }),
          new File(['notes'], 'notes.txt', { type: 'text/plain' }),
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-artwork', 'blob:front-panel.png');
      expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-back-artwork', 'blob:背面.jpg');
    });
  });

  it('auto-assigns artwork files from a dropped side-named folder', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((file: File) => `blob:${file.name}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    const frontFile = new File(['front'], 'panel.png', { type: 'image/png' });
    const frontEntry = {
      file: (successCallback: (file: File) => void) => successCallback(frontFile),
      fullPath: '/正面/panel.png',
      isDirectory: false,
      isFile: true,
    } as unknown as FileSystemFileEntry;
    let readCount = 0;
    const directoryReader = {
      readEntries: (successCallback: (entries: FileSystemEntry[]) => void) => {
        readCount += 1;
        successCallback(readCount === 1 ? [frontEntry] : []);
      },
    } as unknown as FileSystemDirectoryReader;
    const directoryEntry = {
      createReader: () => directoryReader,
      fullPath: '/正面',
      isDirectory: true,
      isFile: false,
    } as unknown as FileSystemDirectoryEntry;

    render(<App />);

    fireEvent.drop(screen.getByRole('region', { name: 'Artwork' }), {
      dataTransfer: {
        files: [],
        items: [
          {
            webkitGetAsEntry: () => directoryEntry,
          },
        ],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-artwork', 'blob:panel.png');
    });
  });

  it('lets users set a face to a custom solid color', () => {
    render(<App />);

    const frontAppearance = screen.getByRole('group', { name: 'Front face appearance' });
    expect(within(frontAppearance).getByLabelText('Artwork')).toBeChecked();

    fireEvent.click(within(frontAppearance).getByLabelText('Solid color'));
    const colorInput = within(frontAppearance).getByLabelText('Front solid color');
    fireEvent.change(colorInput, { target: { value: '#c8e51a' } });

    expect(colorInput).toHaveValue('#c8e51a');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-mode', 'solid');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-color', '#c8e51a');
  });

  it('lets users edit a solid face color with RGB and CMYK channels', () => {
    render(<App />);

    const frontAppearance = screen.getByRole('group', { name: 'Front face appearance' });

    fireEvent.click(within(frontAppearance).getByLabelText('Solid color'));
    fireEvent.change(within(frontAppearance).getByLabelText('Red channel'), { target: { value: '200' } });
    fireEvent.change(within(frontAppearance).getByLabelText('Green channel'), { target: { value: '229' } });
    fireEvent.change(within(frontAppearance).getByLabelText('Blue channel'), { target: { value: '26' } });

    expect(within(frontAppearance).getByLabelText('Front solid color')).toHaveValue('#c8e51a');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-color', '#c8e51a');

    fireEvent.change(within(frontAppearance).getByLabelText('Color mode'), { target: { value: 'cmyk' } });
    fireEvent.change(within(frontAppearance).getByLabelText('Cyan channel'), { target: { value: '0' } });
    fireEvent.change(within(frontAppearance).getByLabelText('Magenta channel'), { target: { value: '100' } });
    fireEvent.change(within(frontAppearance).getByLabelText('Yellow channel'), { target: { value: '100' } });
    fireEvent.change(within(frontAppearance).getByLabelText('Black channel'), { target: { value: '0' } });

    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-color', '#ff0000');
  });

  it('lets users place the mockup on a wood surface', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('Surface'), { target: { value: 'woodTable' } });

    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-surface', 'woodTable');
  });

  it('keeps dimensions first and places language at the bottom of the sidebar', () => {
    render(<App />);

    const dimensionsHeading = screen.getByRole('heading', { name: 'Box dimensions' });
    const languageSelect = screen.getByLabelText('Language');
    const artworkHeading = screen.getByRole('heading', { name: 'Artwork' });
    const renderingHeading = screen.getByRole('heading', { name: 'Rendering' });
    const exportButton = screen.getByRole('button', { name: 'Export PNG' });

    expect(Boolean(dimensionsHeading.compareDocumentPosition(artworkHeading) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(renderingHeading.compareDocumentPosition(languageSelect) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(exportButton.compareDocumentPosition(languageSelect) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('locks the desktop shell to the viewport so the page does not leave a blank footer', () => {
    render(<App />);

    const main = screen.getByRole('main');
    const preview = screen.getByRole('region', { name: '3D packaging preview' });
    const shell = main.firstElementChild;

    expect(main).toHaveClass('lg:h-dvh', 'lg:overflow-hidden');
    expect(shell).toHaveClass('lg:h-full', 'lg:min-h-0');
    expect(preview).toHaveClass('lg:h-full', 'lg:min-h-0');
  });

  it('uses Chinese UI when the browser language is Chinese', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-CN');

    render(<App />);

    expect(screen.getByText('实时 3D 包装盒效果图生成器')).toBeInTheDocument();
    expect(screen.getByLabelText('宽度 mm')).toHaveValue(120);
    expect(screen.getByLabelText('环境光')).not.toBeChecked();
    expect(screen.getByLabelText('阴影')).not.toBeChecked();
    expect(screen.getByLabelText('承载面')).toHaveValue('none');
    expect(screen.getByLabelText('侧面图旋转')).toHaveValue('none');
  });

  it('lets users switch language manually', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'zh' } });

    expect(screen.getByText('实时 3D 包装盒效果图生成器')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出 PNG' })).toBeDisabled();
  });
});
