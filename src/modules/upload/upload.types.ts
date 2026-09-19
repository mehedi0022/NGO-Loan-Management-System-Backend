export type StoredFile = {
  key: string;
  url: string;
  mimeType: string;
  size: number;
};

export type UploadInput = {
  buffer: Buffer;
  mimeType: string;
  size: number;
  folder: string;
};

export interface FileStorageProvider {
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}
