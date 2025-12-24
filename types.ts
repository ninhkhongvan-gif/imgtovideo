
export type AspectRatio = '16:9' | '9:16';

export interface ImageData {
  id: string;
  url: string;
  base64: string;
  type: 'subject' | 'product';
}

export interface VideoGenerationParams {
  subjectImages: string[]; // base64 strings
  productImage?: string; // base64 string
  aspectRatio: AspectRatio;
  backgroundPrompt: string;
  actionPrompt: string;
  speechPrompt: string;
}

export interface OperationState {
  id: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  progressMessage: string;
  videoUrl?: string;
}
