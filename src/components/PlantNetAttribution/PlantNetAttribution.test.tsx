import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../../context/AppContext';
import { useApp } from '../../context/useApp';
import { LANGUAGE_STORAGE_KEY } from '../../services/languagePreference';
import { PlantNetAttribution } from './PlantNetAttribution';
import userEvent from '@testing-library/user-event';

function ChangeLanguage() {
  const { setLang } = useApp();
  return <button type="button" onClick={() => setLang('en')}>English</button>;
}

describe('PlantNetAttribution — UT 933', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it.each([
    ['es', 'El servicio de identificación de especies por imagen', 'Identificación con Pl@ntNet'],
    ['va', 'El servici d’identificació d’espècies per imatge', 'Identificació amb Pl@ntNet'],
    ['en', 'The image-based plant species identification service used', 'Powered by Pl@ntNet'],
  ] as const)('muestra la frase, el logo y el enlace en %s', (language, text, alt) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    render(<AppProvider><PlantNetAttribution /></AppProvider>);

    expect(screen.getByText(new RegExp(text))).toHaveTextContent(/Pl@ntNet/);
    expect(screen.getByRole('img', { name: alt })).toHaveAttribute('src', '/plantnet-logo.svg');
    const link = screen.getByRole('link', { name: 'https://my.plantnet.org/' });
    expect(link).toHaveAttribute('href', 'https://my.plantnet.org/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('actualiza el texto y el nombre accesible al cambiar el idioma', async () => {
    render(<AppProvider><ChangeLanguage /><PlantNetAttribution /></AppProvider>);
    expect(screen.getByRole('img', { name: 'Identificación con Pl@ntNet' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByRole('img', { name: 'Powered by Pl@ntNet' })).toBeInTheDocument();
    expect(screen.getByText(/The image-based plant species identification service used/)).toBeInTheDocument();
    expect(screen.queryByText(/El servicio de identificación/)).not.toBeInTheDocument();
  });
});
