import React, { Profiler, StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../src/App';
import i18n from '../src/i18n';
import typeChart from '../src/typeChart.json';

const types = Object.keys(typeChart);
const names = (English, French = English) => ({
  English, French, German: English, Italian: English, Spanish: English
});
const pokemon = (id, English, primary, secondary, French) => ({
  id,
  names: names(English, French),
  primaryType: { names: names(primary) },
  secondaryType: secondary ? { names: names(secondary) } : null,
  assets: {
    image: `https://example.com/${id}.png`,
    shinyImage: `https://example.com/${id}-shiny.png`
  }
});
const charizard = pokemon('CHARIZARD', 'Charizard', 'Fire', 'Flying', 'Dracaufeu');
const mega = pokemon('MEGA_CHARIZARD_X', 'Mega Charizard X', 'Fire', 'Dragon', 'Méga-Dracaufeu X');
const meowth = pokemon('MEOWTH', 'Meowth', 'Normal', null, 'Miaouss');
const alolan = {
  ...pokemon('ALOLAN_MEOWTH', 'Alolan Meowth', 'Dark', null, "Miaouss d’Alola"),
  formId: 'ALOLAN_MEOWTH'
};
const pokedex = [
  { ...charizard, hasMegaEvolution: true, megaEvolutions: { x: mega } },
  { ...meowth, regionForms: { alola: alolan } }
];

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => pokedex
  }));
});

const selectTypes = (container) => container.querySelectorAll('.type-selector select');
const text = (type) => i18n.t(`type.${type}`);
const assertResults = (section, recommended, toAvoid, mode) => {
  const actual = [...section.querySelectorAll('li')].map((item) => item.textContent);
  const precision = mode === 'attack' ? [2, 3] : [3, 2];
  expect(actual).toEqual([
    ...recommended.map(({ type, multiplier }) => `${text(type)}: ${multiplier.toFixed(precision[0])}x ${i18n.t('damage')}`),
    ...toAvoid.map(({ type, multiplier }) => `${text(type)}: ${multiplier.toFixed(precision[1])}x ${i18n.t('damage')}`)
  ]);
  const prefix = mode === 'attack' ? '@' : '';
  // Search strings retain type-chart order rather than the damage-sorted display order.
  const chartOrder = (items) => [...items].sort((a, b) => types.indexOf(a.type) - types.indexOf(b.type));
  const expectedStrings = [];
  if (recommended.length) {
    expectedStrings.push(chartOrder(recommended).map(({ type }) => `${prefix}${text(type).toLowerCase()}`).join(','));
  }
  if (toAvoid.length) {
    expectedStrings.push(chartOrder(toAvoid).map(({ type }) => `!${prefix}${text(type).toLowerCase()}`).join('&'));
  }
  expect([...section.querySelectorAll('.search-string span')].map((item) => item.textContent)).toEqual(expectedStrings);
  for (const image of section.querySelectorAll('.type-icon')) {
    expect(image.getAttribute('src').startsWith(`${import.meta.env.BASE_URL}assets/icons/`)).toBe(true);
    expect(image.getAttribute('src')).toMatch(/\/[a-z]+\.svg$/);
  }
};

describe('attack recommendations', () => {
  it.each(types)('preserves every single/dual-type combination for %s', (primary) => {
    const { container } = render(<App />);
    const [first, second] = selectTypes(container);
    const section = container.querySelector('.tool-section--attack');
    fireEvent.change(first, { target: { value: primary } });
    for (const secondary of ['', ...types.filter((type) => type !== primary)]) {
      fireEvent.change(second, { target: { value: secondary } });
      const multipliers = types.map((type) => ({
        type,
        multiplier: typeChart[type][primary] * (secondary ? typeChart[type][secondary] : 1)
      }));
      assertResults(
        section,
        multipliers.filter(({ multiplier }) => multiplier > 1).sort((a, b) => b.multiplier - a.multiplier),
        multipliers.filter(({ multiplier }) => multiplier < 1).sort((a, b) => a.multiplier - b.multiplier),
        'attack'
      );
      expect([...second.options].map((option) => option.value)).not.toContain(primary);
    }
  });

  it('retains Pokémon GO multipliers and ignores a secondary type equal to the primary', () => {
    const { container } = render(<App />);
    const [first, second] = selectTypes(container);
    fireEvent.change(first, { target: { value: 'Fire' } });
    fireEvent.change(second, { target: { value: 'Flying' } });
    expect(screen.getByText('Rock: 2.56x damage')).toBeTruthy();
    fireEvent.change(first, { target: { value: 'Flying' } });
    expect(screen.getByText('Rock: 1.60x damage')).toBeTruthy();
  });
});

describe('defense recommendations', () => {
  it.each(types)('preserves recommendations and search strings against %s', (attack) => {
    const { container } = render(<App />);
    fireEvent.change(selectTypes(container)[2], { target: { value: attack } });
    const multipliers = types.map((type) => ({ type, multiplier: typeChart[attack][type] }));
    assertResults(
      container.querySelector('.tool-section--defense'),
      multipliers.filter(({ multiplier }) => multiplier < 1).sort((a, b) => a.multiplier - b.multiplier),
      multipliers.filter(({ multiplier }) => multiplier > 1).sort((a, b) => b.multiplier - a.multiplier),
      'defense'
    );
  });

  it('shows the existing empty-state message when no type is weak to Normal', () => {
    const { container } = render(<App />);
    expect(container.querySelectorAll('.results')).toHaveLength(0);
    fireEvent.change(selectTypes(container)[2], { target: { value: 'Normal' } });
    expect(screen.getByText(i18n.t('no_weaknesses'))).toBeTruthy();
  });
});

describe('Pokémon search', () => {
  const selectPokemon = async (name, container) => {
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    const input = container.querySelector('.pokemon-search input');
    fireEvent.change(input, { target: { value: name.slice(0, 3) } });
    await waitFor(() => expect(container.querySelector(`option[value="${name}"]`)).toBeTruthy());
    fireEvent.change(input, { target: { value: name } });
    await waitFor(() => expect(screen.getByAltText(`${name} regular`)).toBeTruthy());
  };

  it.each([
    [charizard, 'Fire', 'Flying'],
    [mega, 'Fire', 'Dragon'],
    [alolan, 'Dark', '']
  ])('selects regular, mega and regional forms: %j', async (entry, primary, secondary) => {
    const { container } = render(<StrictMode><App /></StrictMode>);
    await selectPokemon(entry.names.English, container);
    const [first, second] = selectTypes(container);
    expect(first.value).toBe(primary);
    expect(second.value).toBe(secondary);
    expect(screen.getByAltText(`${entry.names.English} regular`).getAttribute('src')).toBe(entry.assets.image);
    expect(screen.getByAltText(`${entry.names.English} shiny`).getAttribute('src')).toBe(entry.assets.shinyImage);
    fireEvent.change(first, { target: { value: 'Water' } });
    await waitFor(() => expect(container.querySelector('.pokemon-search input').value).toBe(''));
    expect(container.querySelectorAll('.pokemon-images img')).toHaveLength(0);
  });

  it('searches and selects translated Pokémon names', async () => {
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'fr' } });
    await selectPokemon('Dracaufeu', container);
    expect(selectTypes(container)[0].value).toBe('Fire');
    expect(screen.getByAltText('Dracaufeu shiny')).toBeTruthy();
  });

  it('clears images when the search input is cleared', async () => {
    const { container } = render(<App />);
    await selectPokemon('Charizard', container);
    fireEvent.change(container.querySelector('.pokemon-search input'), { target: { value: '' } });
    expect(container.querySelectorAll('.pokemon-images img')).toHaveLength(0);
    expect(selectTypes(container)[0].value).toBe('Fire');
  });

  it('preserves case-insensitive substring matching without changing exact-name selection', async () => {
    const { container } = render(<App />);
    const input = screen.getByLabelText('Search Pokémon by name');
    fireEvent.change(input, { target: { value: 'HARIZ' } });
    await waitFor(() => expect(container.querySelectorAll('#pokemon-list option')).toHaveLength(2));
    fireEvent.change(input, { target: { value: 'charizard' } });
    expect(selectTypes(container)[0].value).toBe('');
    expect(container.querySelector('.pokemon-images')).toBeNull();
    fireEvent.change(input, { target: { value: 'Charizard' } });
    expect(selectTypes(container)[0].value).toBe('Fire');
  });

  it('keeps selected images while editing a nonempty unmatched query', async () => {
    const { container } = render(<App />);
    await selectPokemon('Charizard', container);
    fireEvent.change(screen.getByLabelText('Search Pokémon by name'), { target: { value: 'unmatched' } });
    expect(container.querySelectorAll('.pokemon-images img')).toHaveLength(2);
    expect(selectTypes(container)[0].value).toBe('Fire');
    expect(container.querySelectorAll('#pokemon-list option')).toHaveLength(0);
  });

  it('updates search results in one render and reuses normalized Pokémon names', async () => {
    const onRender = vi.fn();
    const { container } = render(<Profiler id="app" onRender={onRender}><App /></Profiler>);
    const input = screen.getByLabelText('Search Pokémon by name');
    fireEvent.change(input, { target: { value: 'C' } });
    await waitFor(() => expect(container.querySelector('option[value="Charizard"]')).toBeTruthy());
    onRender.mockClear();
    const lowerCase = String.prototype.toLowerCase;
    const indexedNames = new Set(['Charizard', 'Mega Charizard X', 'Meowth', 'Alolan Meowth']);
    const repeatedNormalizations = vi.fn();
    const spy = vi.spyOn(String.prototype, 'toLowerCase').mockImplementation(function () {
      if (indexedNames.has(String(this))) repeatedNormalizations();
      return lowerCase.call(this);
    });
    fireEvent.change(input, { target: { value: 'har' } });
    spy.mockRestore();
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(repeatedNormalizations).not.toHaveBeenCalled();
    expect(container.querySelectorAll('#pokemon-list option')).toHaveLength(2);
  });

  it('falls back to the English Pokémon name when the selected translation is unavailable', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ ...charizard, names: { English: 'Charizard' } }]
    });
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'fr' } });
    await selectPokemon('Charizard', container);
    expect(selectTypes(container)[0].value).toBe('Fire');
  });

  it('aborts superseded Strict Mode requests and cancels the active request on unmount', () => {
    const { unmount } = render(<StrictMode><App /></StrictMode>);
    const signals = globalThis.fetch.mock.calls.map(([, options]) => options.signal);
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    unmount();
    expect(signals[1].aborted).toBe(true);
  });

  it.each([{ data: [] }, { data: {} }])('reports invalid API data without breaking the type selectors: $data', async ({ data }) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch.mockResolvedValue({ ok: true, json: async () => data });
    const { container } = render(<App />);
    await waitFor(() => expect(error).toHaveBeenCalledWith('Failed to fetch pokedex:', 'Invalid or empty pokedex data'));
    fireEvent.change(selectTypes(container)[0], { target: { value: 'Fire' } });
    expect(screen.getByText('Water: 1.60x damage')).toBeTruthy();
  });

  it('logs API errors and leaves manual type selection usable', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch.mockResolvedValue({ ok: false, status: 503 });
    const { container } = render(<App />);
    await waitFor(() => expect(error).toHaveBeenCalledWith('Failed to fetch pokedex:', 'HTTP error: 503'));
    fireEvent.change(selectTypes(container)[0], { target: { value: 'Fire' } });
    expect(screen.getByText('Water: 1.60x damage')).toBeTruthy();
  });
});

describe('localization and clipboard', () => {
  it.each(['en', 'fr', 'de', 'it', 'es', 'pt-BR'])('retains %s translations and localized search strings', async (language) => {
    await i18n.changeLanguage(language);
    const { container } = render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(i18n.t('title'));
    fireEvent.change(selectTypes(container)[0], { target: { value: 'Fire' } });
    const section = container.querySelector('.tool-section--attack');
    expect(within(section).getByText(`@${text('Ground').toLowerCase()},@${text('Rock').toLowerCase()},@${text('Water').toLowerCase()}`)).toBeTruthy();
    expect(localStorage.getItem('i18nextLng')).toBe(language);
    expect(document.documentElement.lang).toBe(language);
  });

  it('copies both attack and defense search strings with translated confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const alert = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const { container } = render(<App />);
    const [first, , attack] = selectTypes(container);
    fireEvent.change(first, { target: { value: 'Fire' } });
    fireEvent.change(attack, { target: { value: 'Fire' } });
    for (const box of container.querySelectorAll('.search-string')) {
      fireEvent.click(box.querySelector('button'));
      await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(box.querySelector('span').textContent));
    }
    expect(alert).toHaveBeenCalledTimes(4);
    expect(alert).toHaveBeenLastCalledWith('Copied to clipboard!');
  });

  it('updates memoized recommendations when the language changes', async () => {
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText('Defending Type 1:'), { target: { value: 'Fire' } });
    fireEvent.change(screen.getByLabelText('Attacking Type:'), { target: { value: 'Fire' } });
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'fr' } });
    await waitFor(() => expect(screen.getByText('@sol,@roche,@eau')).toBeTruthy());
    expect(screen.getByText('roche,feu,eau,dragon')).toBeTruthy();
    expect(container.querySelector('#defending-type1').value).toBe('Fire');
  });

  it('preserves the existing English fallback for the missing Portuguese search label', async () => {
    await i18n.changeLanguage('pt-BR');
    render(<App />);
    expect(screen.getByLabelText('Search Pokémon by name')).toBeTruthy();
  });

  it.each(['unavailable', 'rejected'])('logs clipboard errors without false confirmation: %s', async (failure) => {
    const rejection = new Error('Clipboard permission denied');
    vi.stubGlobal('navigator', failure === 'unavailable' ? {} : {
      clipboard: { writeText: vi.fn().mockRejectedValue(rejection) }
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alert = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText('Defending Type 1:'), { target: { value: 'Fire' } });
    fireEvent.click(container.querySelector('.search-string button'));
    await waitFor(() => expect(error).toHaveBeenCalledWith('Failed to copy:', expect.any(Error)));
    expect(alert).not.toHaveBeenCalled();
  });
});
