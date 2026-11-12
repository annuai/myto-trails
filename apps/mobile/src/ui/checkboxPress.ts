/** What a press on a checkbox does: nothing at all when disabled, else a tick when ticking on, then the change. */
export function checkboxPress(checked: boolean, disabled: boolean | undefined, onChange: (v: boolean) => void, tick: () => void): void {
  if (disabled) return;
  if (!checked) tick();
  onChange(!checked);
}
