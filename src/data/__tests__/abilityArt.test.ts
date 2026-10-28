import { CHARACTERS } from '../characters';
import { abilityArt } from '../abilityArt';

describe('abilityArt', () => {
  it('gives every ability in the catalogue a card', () => {
    for (const character of CHARACTERS) {
      const art = abilityArt(character.ability);
      expect(art.icon.length).toBeGreaterThan(0);
      expect(art.accent).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('reads the obvious ones out of the name', () => {
    expect(abilityArt('Огненный шар').icon).toBe('flame');
    expect(abilityArt('Молния').icon).toBe('bolt');
    expect(abilityArt('Бьякуган').icon).toBe('eye');
    expect(abilityArt('Медицинское ниндзюцу, Печать Инь').icon).toBe('heart');
    expect(abilityArt('Телепатия').icon).toBe('sparkles');
    // The sand matters more than the controlling of it.
    expect(abilityArt('Управление песком').icon).toBe('globe');
    expect(abilityArt('Контроль над разумом').icon).toBe('sparkles');
  });

  // Half the catalogue mentions a blow or a blade somewhere; the specific
  // families have to win over that one.
  it('prefers the specific family over the catch-all blade one', () => {
    expect(abilityArt('Огненный удар').icon).toBe('flame');
    expect(abilityArt('Ледяной клинок').icon).toBe('wave');
    expect(abilityArt('Удар кулаком').icon).toBe('swords');
  });

  it('still gives a card to a name that says nothing', () => {
    const art = abilityArt('Расенган');
    expect(art.icon.length).toBeGreaterThan(0);
    expect(art.accent).toMatch(/^#[0-9A-F]{6}$/i);
  });

  // The same question must not look different each time it is asked.
  it('is the same card for the same ability every time', () => {
    for (const name of ['Расенган', 'Тетрадь смерти', 'Один за всех']) {
      expect(abilityArt(name)).toEqual(abilityArt(name));
    }
  });

  it('does not put every unnamed ability under one symbol', () => {
    const unnamed = ['Расенган', 'Тетрадь смерти', 'Один за всех', 'Распад', 'Невесомость', 'Стирание причуд'];
    const icons = new Set(unnamed.map((name) => abilityArt(name).icon));
    expect(icons.size).toBeGreaterThan(1);
  });

  it('spreads the catalogue over several symbols rather than one', () => {
    const icons = new Set(CHARACTERS.map((c) => abilityArt(c.ability).icon));
    expect(icons.size).toBeGreaterThanOrEqual(8);
  });
});
