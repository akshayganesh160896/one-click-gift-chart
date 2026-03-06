export const APP_PASSCODE = '6144373000';
export const APP_ACCESS_COOKIE = 'gift_chart_access';

export const isValidAppPasscode = (value: unknown): boolean =>
  typeof value === 'string' && value === APP_PASSCODE;
