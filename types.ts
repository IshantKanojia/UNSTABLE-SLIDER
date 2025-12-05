export type ChaosMode = 
  | 'normal'
  | 'shaking'
  | 'reverse'
  | 'invisible'
  | 'slippery'
  | 'frozen';

export type ToastVariant = 'normal' | 'warning' | 'danger' | 'glitch';

export interface Toast {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: number;
  variant: ToastVariant;
  scale: number;
}