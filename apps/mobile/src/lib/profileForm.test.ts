import { describe, expect, it } from 'vitest';
import { BIO_MAX, GENDER_CHOICES, NAME_MAX, profileProblem } from './profileForm';

describe('profileProblem', () => {
  it('accepts a name of 2 to 40 characters and a short bio without links', () => {
    expect(profileProblem({ name: 'Ab', bio: '' })).toBeUndefined();
    expect(profileProblem({ name: 'a'.repeat(NAME_MAX), bio: 'x'.repeat(BIO_MAX) })).toBeUndefined();
  });
  it('trims before counting', () => {
    expect(profileProblem({ name: ' a ', bio: '' })).toMatch(/2 to 40/);
    expect(profileProblem({ name: 'Annuai', bio: ' '.repeat(400) })).toBeUndefined();
  });
  it('refuses a short or long name', () => {
    expect(profileProblem({ name: 'x', bio: '' })).toMatch(/2 to 40/);
    expect(profileProblem({ name: 'x'.repeat(NAME_MAX + 1), bio: '' })).toMatch(/2 to 40/);
  });
  it('refuses a long bio and web addresses in it', () => {
    expect(profileProblem({ name: 'Annuai', bio: 'x'.repeat(BIO_MAX + 1) })).toMatch(/300/);
    expect(profileProblem({ name: 'Annuai', bio: 'see www.example.com' })).toMatch(/web addresses/);
  });
});

describe('GENDER_CHOICES', () => {
  it('offers male, female, other and prefer not to say (null)', () => {
    expect(GENDER_CHOICES.map((g) => g.value)).toEqual(['male', 'female', 'other', null]);
    expect(GENDER_CHOICES.map((g) => g.label)).toEqual(['Male', 'Female', 'Other', 'Prefer not to say']);
  });
});
