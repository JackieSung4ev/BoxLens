import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('./components/Scene', () => ({
  Scene: ({
    artwork,
    faceAppearance,
    finishSettings,
    settings,
  }: {
    artwork?: { front?: { url: string }; back?: { url: string } };
    faceAppearance?: { front?: { color: string; mode: string } };
    finishSettings?: { front?: { mask?: { url: string }; mode: string } };
    settings?: { cameraLengthMm: number; cornerRadiusMm: number; rgbProof: boolean; shadows: boolean; surface: string };
  }) => (
    <div
      data-back-artwork={artwork?.back?.url}
      data-camera-length={settings?.cameraLengthMm}
      data-corner-radius={settings?.cornerRadiusMm}
      data-front-foil-mask={finishSettings?.front?.mask?.url}
      data-front-foil-mode={finishSettings?.front?.mode}
      data-front-artwork={artwork?.front?.url}
      data-front-color={faceAppearance?.front?.color}
      data-front-mode={faceAppearance?.front?.mode}
      data-rgb-proof={settings?.rgbProof ? 'on' : 'off'}
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
    expect(container.innerHTML).toContain('grid-cols-[88px_minmax(0,1fr)] items-start');
    expect(screen.getByLabelText('Environment lighting')).not.toBeChecked();
    expect(screen.getByLabelText('Shadows')).not.toBeChecked();
    expect(screen.getByLabelText('RGB proof preview')).toBeChecked();
    expect(screen.getByLabelText('Camera lens length in mm')).toHaveValue('110');
    expect(screen.getByLabelText('Corner radius in mm')).toHaveValue('3');
    expect(screen.getByLabelText('Surface')).toHaveValue('none');
    expect(screen.queryByRole('option', { name: 'Wood table' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Marble' })).toBeInTheDocument();
    expect(screen.getByLabelText('Side artwork rotation')).toHaveValue('none');
    expect(screen.getByLabelText('Lighting preset')).toHaveValue('softbox');
    expect(screen.getByLabelText('Light intensity')).toHaveValue('1');
    expect(screen.getByLabelText('Light direction')).toHaveValue('frontRight');
    expect(screen.getByRole('button', { name: /export png/i })).toBeDisabled();
    expect(screen.queryByText('Upload')).not.toBeInTheDocument();
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-shadows', 'off');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-rgb-proof', 'on');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-camera-length', '110');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-corner-radius', '3');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-foil-mode', 'off');
    expect(screen.queryByLabelText('Front foil mode')).not.toBeInTheDocument();
    expect(container.querySelector('aside')).toHaveClass('scrollbar-slim');
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

  it('lets users place the mockup on wood and marble surfaces', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('Surface'), { target: { value: 'woodFloor' } });

    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-surface', 'woodFloor');

    fireEvent.change(screen.getByLabelText('Surface'), { target: { value: 'marble' } });

    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-surface', 'marble');
  });

  it('lets users tune RGB proof display, camera lens length, and box corner radius', () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText('RGB proof preview'));
    fireEvent.change(screen.getByLabelText('Camera lens length in mm'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('Corner radius in mm'), { target: { value: '8' } });

    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-rgb-proof', 'off');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-camera-length', '70');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-corner-radius', '8');
  });

  it('restores rendering controls to their defaults without clearing dimensions or artwork', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((file: File) => `blob:${file.name}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    render(<App />);

    fireEvent.change(screen.getByLabelText('Width in mm'), { target: { value: '140' } });
    fireEvent.drop(screen.getByRole('region', { name: 'Artwork' }), {
      dataTransfer: {
        files: [new File(['front'], 'front-panel.png', { type: 'image/png' })],
      },
    });
    fireEvent.click(screen.getByLabelText('RGB proof preview'));
    fireEvent.change(screen.getByLabelText('Camera lens length in mm'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('Corner radius in mm'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Surface'), { target: { value: 'marble' } });
    fireEvent.click(screen.getByLabelText('Shadows'));

    await waitFor(() => {
      expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-artwork', 'blob:front-panel.png');
    });
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-camera-length', '70');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-rgb-proof', 'off');

    fireEvent.click(screen.getByRole('button', { name: 'Restore default settings' }));

    expect(screen.getByLabelText('Width in mm')).toHaveValue(140);
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-artwork', 'blob:front-panel.png');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-camera-length', '110');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-corner-radius', '3');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-rgb-proof', 'on');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-shadows', 'off');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-surface', 'none');
  });

  it('lets users enable automatic hot foil detection for a face', () => {
    render(<App />);

    const frontAppearance = screen.getByRole('group', { name: 'Front face appearance' });
    const foilToggle = within(frontAppearance).getByRole('button', { name: 'Front hot foil settings' });

    expect(foilToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(foilToggle);
    expect(foilToggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.change(within(frontAppearance).getByLabelText('Front foil mode'), { target: { value: 'auto' } });

    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-foil-mode', 'auto');
  });

  it('lets users upload and remove a hot foil mask for a face', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((file: File) => `blob:${file.name}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    render(<App />);

    const frontAppearance = screen.getByRole('group', { name: 'Front face appearance' });
    fireEvent.click(within(frontAppearance).getByRole('button', { name: 'Front hot foil settings' }));
    fireEvent.change(within(frontAppearance).getByLabelText('Front foil mode'), { target: { value: 'mask' } });
    fireEvent.change(within(frontAppearance).getByLabelText('Front foil mask'), {
      target: {
        files: [new File(['foil'], 'foil-mask.png', { type: 'image/png' })],
      },
    });

    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-foil-mode', 'mask');
    expect(screen.getByTestId('scene-preview')).toHaveAttribute('data-front-foil-mask', 'blob:foil-mask.png');

    fireEvent.click(within(frontAppearance).getByRole('button', { name: 'Remove Front foil mask' }));

    expect(screen.getByTestId('scene-preview')).not.toHaveAttribute('data-front-foil-mask');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foil-mask.png');
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
