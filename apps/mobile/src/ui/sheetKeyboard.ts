/**
 * How far to lift a sheet's bottom edge for the on-screen keyboard. On iOS the keyboard's own height is enough. On Android the app draws
 * edge to edge and the window is not resized for the keyboard, and the height React Native reports leaves out the navigation bar that the
 * keyboard covers, so that bar's height is added. Zero when there is no keyboard.
 */
export const keyboardLift = (os: string, keyboardHeight: number, bottomInset: number): number => (keyboardHeight > 0 ? keyboardHeight + (os === 'android' ? bottomInset : 0) : 0);
