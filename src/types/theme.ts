export type PrimaryColorId = 'orange' | 'dark-blue' | 'red' | 'light-blue' | 'black';

export interface PrimaryColorOption {
  id: PrimaryColorId;
  name: string;
  hex: string;
  hover: string;
  active: string;
  light: string;
  border: string;
  text: string;
  foreground: string;
  foregroundRgb?: string;
  ring: string;
}

export interface CompanySettings {
  primaryColor: string;
  updatedAt?: string;
  updatedBy?: string;
}
