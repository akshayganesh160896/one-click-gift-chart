export const DELETE_PASSWORD = 'benefactor';

export function isValidDeletePassword(password: unknown): boolean {
  return typeof password === 'string' && password === DELETE_PASSWORD;
}
