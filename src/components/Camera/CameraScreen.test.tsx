import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CameraScreen } from './CameraScreen';

describe('CameraScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the initial permission request prompt', () => {
    render(<CameraScreen onClose={vi.fn()} />);

    expect(
      screen.getByText(/necesitamos tu cÃ¡mara para reconocer plantas/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^permitir cÃ¡mara$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^no permitir cÃ¡mara$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /elegir de la galerÃ­a/i })
    ).toBeInTheDocument();
  });

  it('shows permission denied screen with explanation when user rejects permission', async () => {
    render(<CameraScreen onClose={vi.fn()} />);

    const denyButton = await screen.findByRole('button', { name: /^no permitir cÃ¡mara$/i });
