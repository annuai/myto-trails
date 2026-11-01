import { describe, expect, it } from 'vitest';
import { BIO_MAX, GENDER_CHOICES, NAME_MAX, cleanPhone, phonePatch, phoneProblem, profileProblem, welcomeBody, welcomeFailure, welcomeProblems } from './profileForm';

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

describe('phoneProblem', () => {
  it('accepts empty and 7 to 15 digits with spaces, dashes and a leading +', () => {
    for (const p of ['', '  ', '98123 45678', '+91 98123-45678', '1234567', '+123456789012345']) expect(phoneProblem(p)).toBeUndefined();
  });
  it('refuses too few, too many and non-digits', () => {
    for (const p of ['123456', '1234567890123456', 'abc1234567', '98+1234567']) expect(phoneProblem(p)).toMatch(/valid phone number/);
  });
});

describe('welcomeProblems', () => {
  it('needs a name of 2 to 40 characters and the declaration', () => {
    expect(welcomeProblems({ name: 'Asha', phone: '', declared: true })).toEqual({});
    expect(welcomeProblems({ name: 'A', phone: '', declared: false })).toEqual({ name: expect.stringMatching(/2 to 40/), declaration: 'Please confirm the declaration to continue.' });
    expect(welcomeProblems({ name: 'Asha', phone: '12', declared: true }).phone).toBeDefined();
  });
});

describe('welcomeBody', () => {
  it('is private by default, trims the name and leaves an empty phone out', () => {
    expect(welcomeBody({ name: ' Asha ', gender: null, phone: ' ' })).toEqual({ confirmed: true, displayName: 'Asha', public: false, gender: null });
    expect(welcomeBody({ name: 'Asha', gender: 'female', phone: '+91 98123 45678' })).toMatchObject({ gender: 'female', phone: '+919812345678' });
  });
});

describe('phonePatch', () => {
  it('sends nothing when unchanged, the number when changed and null when cleared', () => {
    expect(cleanPhone('(98) 12-3.4')).toBe('981234');
    expect(phonePatch('+919812345678', '+91 98123 45678')).toBeUndefined();
    expect(phonePatch(null, '')).toBeUndefined();
    expect(phonePatch(null, '9812345678')).toEqual({ phone: '9812345678' });
    expect(phonePatch('9812345678', ' ')).toEqual({ phone: null });
  });
});

describe('welcomeFailure', () => {
  it('words the server errors', () => {
    expect(welcomeFailure({ status: 422, code: 'declaration_required', message: 'x' })).toMatch(/confirm the declaration/);
    expect(welcomeFailure({ status: 422, code: 'validation_failed', message: 'x', fields: { phone: 'bad' } })).toMatch(/valid phone/);
    expect(welcomeFailure({ status: 422, code: 'validation_failed', message: 'x' })).toMatch(/2 to 40/);
    expect(welcomeFailure({ status: 404, code: 'not_found', message: 'Not found.' })).toBe('Not found.');
  });
});
