import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const languageNames = {
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  es: 'Spanish'
};
const emptyImages = { image: '', shinyImage: '' };
const toSearchPokemon = (pokemon, id = pokemon.id) => ({
  id,
  names: pokemon.names,
  primaryType: pokemon.primaryType,
  secondaryType: pokemon.secondaryType,
  assets: pokemon.assets
});

const PokemonSearch = ({ language, setDefendingType1, setDefendingType2, defendingType1, defendingType2 }) => {
  const { t } = useTranslation();
  const [pokemonData, setPokemonData] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [selectedImages, setSelectedImages] = useState(emptyImages);
  const selectedTypes = useRef(null);
  const normalizedLanguage = languageNames[language] || 'English';

  const searchEntries = useMemo(() => pokemonData.map(pokemon => {
    const name = pokemon.names?.[normalizedLanguage] || pokemon.names?.English || '';
    return { pokemon, name, searchName: name.toLowerCase() };
  }), [pokemonData, normalizedLanguage]);

  const filteredPokemon = useMemo(() => {
    if (!searchInput) return [];
    const query = searchInput.toLowerCase();
    return searchEntries.filter(({ searchName }) => searchName.includes(query));
  }, [searchInput, searchEntries]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPokemonData = async () => {
      try {
        const response = await fetch('https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json', {
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Invalid or empty pokedex data');
        }
        const flattenedData = data.flatMap(pokemon => {
          const regularPokemon = toSearchPokemon(pokemon);
          const megaEvolutions = pokemon.hasMegaEvolution && pokemon.megaEvolutions
            ? Object.values(pokemon.megaEvolutions).map(mega => toSearchPokemon(mega))
            : [];
          const regionForms = pokemon.regionForms
            ? Object.values(pokemon.regionForms).map(form => toSearchPokemon(form, form.formId))
            : [];

          return [regularPokemon, ...megaEvolutions, ...regionForms];
        });

        if (!controller.signal.aborted) setPokemonData(flattenedData);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch pokedex:', error instanceof Error ? error.message : error);
      }
    };

    fetchPokemonData();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const selection = selectedTypes.current;
    if (selection && selection.type1 === defendingType1 && selection.type2 === defendingType2) return;
    selectedTypes.current = null;
    setSearchInput('');
    setSelectedImages(emptyImages);
  }, [defendingType1, defendingType2]);

  const handleInputChange = (event) => {
    const inputValue = event.target.value;
    setSearchInput(inputValue);
    if (!inputValue) {
      setSelectedImages(emptyImages);
      return;
    }
    const selectedEntry = searchEntries.find(({ name }) => name === inputValue);
    if (selectedEntry) {
      const selectedPokemon = selectedEntry.pokemon;
      const type1 = selectedPokemon.primaryType?.names?.English || '';
      const type2 = selectedPokemon.secondaryType?.names?.English || '';
      selectedTypes.current = { type1, type2 };
      setSelectedImages({
        image: selectedPokemon.assets?.image || '',
        shinyImage: selectedPokemon.assets?.shinyImage || ''
      });
      setDefendingType1(type1);
      setDefendingType2(type2);
    }
  };

  return (
    <div className="pokemon-search">
      <label htmlFor="pokemon-search">{t('pokemon_search')} </label>
      <input
        id="pokemon-search"
        type="text"
        list="pokemon-list"
        value={searchInput}
        onChange={handleInputChange}
        placeholder={t('pokemon_search')}
        autoComplete="off"
      />
      <datalist id="pokemon-list">
        {filteredPokemon.map(({ pokemon, name }) => (
          <option
            key={pokemon.id}
            value={name}
          >
            {name}
          </option>
        ))}
      </datalist>
      {(selectedImages.image || selectedImages.shinyImage) && (
        <div className="pokemon-images" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
          {selectedImages.image && (
            <img src={selectedImages.image} alt={`${searchInput} regular`} style={{ maxWidth: '100px' }} />
          )}
          {selectedImages.shinyImage && (
            <img src={selectedImages.shinyImage} alt={`${searchInput} shiny`} style={{ maxWidth: '100px' }} />
          )}
        </div>
      )}
    </div>
  );
};

export default PokemonSearch;
