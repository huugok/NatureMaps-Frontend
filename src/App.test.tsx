import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';
import { LANGUAGE_STORAGE_KEY } from './services/languagePreference';

const renderApp = () => render(<App />);

const openLanguagePage = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Ajustes' }));
  fireEvent.click(screen.getByRole('button', { name: /idioma/i }));
};

describe('selector de idioma en Ajustes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('arranca con el español seleccionado por defecto', () => {
    renderApp();

    expect(screen.getByRole('tab', { name: 'Ir a Inicio' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir Ajustes' }));
    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Idioma: Español' })).toBeInTheDocument();
  });

  it('ofrece español, valenciano e inglés en Ajustes > Idioma', () => {
    renderApp();
    openLanguagePage();

    expect(screen.getByRole('heading', { name: 'Idioma' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Valencià' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('guarda el inglés como preferencia sin traducir los textos', () => {
    renderApp();
    openLanguagePage();

    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Idioma: English' })).toBeInTheDocument();
    // La traducción de los textos llega en otra UT: aquí todo sigue en español.
    expect(screen.getByRole('tab', { name: 'Ir a Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ver Mapa de especies y árboles' })).toBeInTheDocument();
  });

  it('guarda el valenciano como preferencia', () => {
    renderApp();
    openLanguagePage();

    fireEvent.click(screen.getByRole('radio', { name: 'Valencià' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('va');
    expect(screen.getByRole('button', { name: 'Idioma: Valencià' })).toBeInTheDocument();
  });

  it('descarta la selección si se sale sin guardar', () => {
    renderApp();
    openLanguagePage();

    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Idioma: Español' })).toBeInTheDocument();
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('restaura la preferencia guardada al volver a abrir la app', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'va');
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir Ajustes' }));
    expect(screen.getByRole('button', { name: 'Idioma: Valencià' })).toBeInTheDocument();
  });

  it('mantiene las cinco pestañas y su rejilla al guardar el idioma', () => {
    renderApp();

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tablist')).toHaveClass('grid-cols-5');

    openLanguagePage();
    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tablist')).toHaveClass('grid-cols-5');
  });
});
