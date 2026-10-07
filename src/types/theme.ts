export type PrimaryColorId = 'dark-blue' | 'red' | 'black'| 'orange';

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
