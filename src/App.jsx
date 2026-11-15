import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './App.scss';
import typeChart from './typeChart.json';
import SwordIcon from './assets/icons/sword';
import ShieldIcon from './assets/icons/shield';
import CopyIcon from './assets/icons/copy';
import PokemonSearch from './components/PokemonSearch';

const types = Object.keys(typeChart);
const languages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'es', name: 'Español' }
];

const App = () => {
  const { t, i18n } = useTranslation();
  const [defendingType1, setDefendingType1] = useState('');
  const [defendingType2, setDefendingType2] = useState('');
  const [attackingType, setAttackingType] = useState('');

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage || 'en';
  }, [i18n.resolvedLanguage]);

  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
  };

  const copyToClipboard = async (text) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API is not available');
      await navigator.clipboard.writeText(text);
      alert(t('copied_to_clipboard'));
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const {
    recommended: attackRecommendations,
    toAvoid: attackToAvoid,
    recommendedSearchString: attackRecommendedSearchString,
    toAvoidSearchString: attackToAvoidSearchString
  } = useMemo(() => {
    if (!defendingType1) return { recommended: [], toAvoid: [], recommendedSearchString: '', toAvoidSearchString: '' };

    const recommended = [];
    const toAvoid = [];
    types.forEach(attackType => {
      const multiplier = defendingType2 && defendingType2 !== defendingType1
        ? typeChart[attackType][defendingType1] * typeChart[attackType][defendingType2]
        : typeChart[attackType][defendingType1];

      if (multiplier > 1) {
        recommended.push({ attackType, multiplier });
      } else if (multiplier < 1) {
        toAvoid.push({ attackType, multiplier });
      }
    });

    const recommendedSearchString = recommended.length > 0
      ? recommended.map(item => `@${t(`type.${item.attackType}`).toLowerCase()}`).join(',')
      : '';
    const toAvoidSearchString = toAvoid.length > 0
      ? toAvoid.map(item => `!@${t(`type.${item.attackType}`).toLowerCase()}`).join('&')
      : '';

    return {
      recommended: recommended.sort((a, b) => b.multiplier - a.multiplier),
      toAvoid: toAvoid.sort((a, b) => a.multiplier - b.multiplier),
      recommendedSearchString,
      toAvoidSearchString
    };
  }, [defendingType1, defendingType2, t]);

  const {
    recommended: defenseRecommendations,
    toAvoid: defenseToAvoid,
    recommendedSearchString: defenseRecommendedSearchString,
    toAvoidSearchString: defenseToAvoidSearchString
  } = useMemo(() => {
    if (!attackingType) return { recommended: [], toAvoid: [], recommendedSearchString: '', toAvoidSearchString: '' };

    const recommended = [];
    const toAvoid = [];
    types.forEach(defendingType => {
      const multiplier = typeChart[attackingType][defendingType];
      if (multiplier < 1) {
        recommended.push({ defendingType, multiplier });
      } else if (multiplier > 1) {
        toAvoid.push({ defendingType, multiplier });
      }
    });

    const recommendedSearchString = recommended.length > 0
      ? recommended.map(item => t(`type.${item.defendingType}`).toLowerCase()).join(',')
      : '';
    const toAvoidSearchString = toAvoid.length > 0
      ? toAvoid.map(item => `!${t(`type.${item.defendingType}`).toLowerCase()}`).join('&')
      : '';

    return {
      recommended: recommended.sort((a, b) => a.multiplier - b.multiplier),
      toAvoid: toAvoid.sort((a, b) => b.multiplier - a.multiplier),
      recommendedSearchString,
      toAvoidSearchString
    };
  }, [attackingType, t]);

  return (
    <main id="main-content" className="container">
      <header className="header">
        <h1><img src={`${import.meta.env.BASE_URL}assets/icons/pogotype-logo-512x512.png`} alt="" width="192" height="192"/> {t('title')}</h1>
        <div className="language-switcher">
          <label htmlFor="language-select">{t('language')}</label>
          <select
            id="language-select"
            value={i18n.language}
            onChange={handleLanguageChange}
          >
            {languages.map(({ code, name }) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
      </header>

      <section className="tool-section tool-section--attack" aria-labelledby="attack-tool-title">
        <h2 id="attack-tool-title"><SwordIcon/> {t('tool1_title')}</h2>
        <p>{t('tool1_description')}</p>
        <PokemonSearch
          language={i18n.language}
          setDefendingType1={setDefendingType1}
          setDefendingType2={setDefendingType2}
          defendingType1={defendingType1}
          defendingType2={defendingType2}
        />
        <div className="type-selector">
          <div>
            <label htmlFor="defending-type1">{t('defending_type1')} </label>
            <select id="defending-type1" value={defendingType1} onChange={(e) => setDefendingType1(e.target.value)}>
              <option value="">{t('select_type')}</option>
              {types.map(type => (
                <option key={type} value={type}>{t(`type.${type}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="defending-type2">{t('defending_type2')} </label>
            <select id="defending-type2" value={defendingType2} onChange={(e) => setDefendingType2(e.target.value)}>
              <option value="">{t('none')}</option>
              {types
                .filter(type => type !== defendingType1)
                .map(type => (
                  <option key={type} value={type}>{t(`type.${type}`)}</option>
                ))}
            </select>
          </div>
        </div>
        {defendingType1 && (
          <div className="results">
            <h3>{t('recommended_attack_types')}</h3>
            {attackRecommendations.length > 0 ? (
              <>
                <ul>
                  {attackRecommendations.map(({ attackType, multiplier }) => (
                    <li key={attackType} className="type-item">
                      <img
                        src={`${import.meta.env.BASE_URL}assets/icons/${attackType.toLowerCase()}.svg`}
                        alt={`${t(`type.${attackType}`)} icon`}
                        className="type-icon"
                      />
                      {t(`type.${attackType}`)}: {multiplier.toFixed(2)}x {t('damage')}
                    </li>
                  ))}
                </ul>
                <h4>{t('search_string')}:</h4>
                <div className="search-string">
                  <span>{attackRecommendedSearchString}</span>
                  <button onClick={() => copyToClipboard(attackRecommendedSearchString)} aria-label={t('copy')} title={t('copy')}>
                    <CopyIcon />
                  </button>
                </div>
              </>
            ) : (
              <p>{t('no_super_effective')}</p>
            )}
            <h3>{t('attack_types_to_avoid')}</h3>
            {attackToAvoid.length > 0 ? (
              <>
                <ul>
                  {attackToAvoid.map(({ attackType, multiplier }) => (
                    <li key={attackType} className="type-item">
                      <img
                        src={`${import.meta.env.BASE_URL}assets/icons/${attackType.toLowerCase()}.svg`}
                        alt={`${t(`type.${attackType}`)} icon`}
                        className="type-icon"
                      />
                      {t(`type.${attackType}`)}: {multiplier.toFixed(3)}x {t('damage')}
                    </li>
                  ))}
                </ul>
                <h4>{t('search_string')}:</h4>
                <div className="search-string">
                  <span>{attackToAvoidSearchString}</span>
                  <button onClick={() => copyToClipboard(attackToAvoidSearchString)} aria-label={t('copy')} title={t('copy')}>
                    <CopyIcon />
                  </button>
                </div>
              </>
            ) : (
              <p>{t('no_less_effective')}</p>
            )}
          </div>
        )}
      </section>

      <section className="tool-section tool-section--defense" aria-labelledby="defense-tool-title">
        <h2 id="defense-tool-title"><ShieldIcon/> {t('tool2_title')}</h2>
        <p>{t('tool2_description')}</p>
        <div className="type-selector">
          <div>
            <label htmlFor="attacking-type">{t('attacking_type')} </label>
            <select id="attacking-type" value={attackingType} onChange={(e) => setAttackingType(e.target.value)}>
              <option value="">{t('select_type')}</option>
              {types.map(type => (
                <option key={type} value={type}>{t(`type.${type}`)}</option>
              ))}
            </select>
          </div>
        </div>
        {attackingType && (
          <div className="results">
            <h3>{t('recommended_defending_types')}</h3>
            {defenseRecommendations.length > 0 ? (
              <>
                <ul>
                  {defenseRecommendations.map(({ defendingType, multiplier }) => (
                    <li key={defendingType} className="type-item">
                      <img
                        src={`${import.meta.env.BASE_URL}assets/icons/${defendingType.toLowerCase()}.svg`}
                        alt={`${t(`type.${defendingType}`)} icon`}
                        className="type-icon"
                      />
                      {t(`type.${defendingType}`)}: {multiplier.toFixed(3)}x {t('damage')}
                    </li>
                  ))}
                </ul>
                <h4>{t('search_string')}:</h4>
                <div className="search-string">
                  <span>{defenseRecommendedSearchString}</span>
                  <button onClick={() => copyToClipboard(defenseRecommendedSearchString)} aria-label={t('copy')} title={t('copy')}>
                    <CopyIcon />
                  </button>
                </div>
              </>
            ) : (
              <p>{t('no_resistances')}</p>
            )}
            <h3>{t('defending_types_to_avoid')}</h3>
            {defenseToAvoid.length > 0 ? (
              <>
                <ul>
                  {defenseToAvoid.map(({ defendingType, multiplier }) => (
                    <li key={defendingType} className="type-item">
                      <img
                        src={`${import.meta.env.BASE_URL}assets/icons/${defendingType.toLowerCase()}.svg`}
                        alt={`${t(`type.${defendingType}`)} icon`}
                        className="type-icon"
                      />
                      {t(`type.${defendingType}`)}: {multiplier.toFixed(2)}x {t('damage')}
                    </li>
                  ))}
                </ul>
                <h4>{t('search_string')}:</h4>
                <div className="search-string">
                  <span>{defenseToAvoidSearchString}</span>
                  <button onClick={() => copyToClipboard(defenseToAvoidSearchString)} aria-label={t('copy')} title={t('copy')}>
                    <CopyIcon />
                  </button>
                </div>
              </>
            ) : (
              <p>{t('no_weaknesses')}</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default App;
