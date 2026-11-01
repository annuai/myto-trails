const CHOICES = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "none", label: "Prefer not to say" },
] as const;

/** The private gender choice, shared by the welcome step and the account page. `value` is male, female, other or none. */
export function GenderFields({ value }: { value: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Gender (optional)</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {CHOICES.map((c) => (
          <label key={c.value} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name="gender" value={c.value} defaultChecked={value === c.value} className="size-5" /> {c.label}
          </label>
        ))}
      </div>
      <p className="text-sm text-muted">Private. Only used to let you create and join women-only clubs. It is never shown on your profile.</p>
    </fieldset>
  );
}
