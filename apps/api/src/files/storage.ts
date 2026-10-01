import type { Provider } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { getEnv } from "../config";

/**
 * Where photos live. The database keeps only each photo's key
 * (`stores/<store id>/<file>`); this decides where the bytes go.
 * Development: a folder on this machine, served by the API's /files.
 * Production: Cloudflare R2 (roadmap step 8) — a second implementation of
 * this same interface, so nothing else changes.
 */
export interface FileStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<Buffer | null>;
  publicUrl(key: string): string;
}

export const FILE_STORAGE = Symbol("FILE_STORAGE");

export class LocalFileStorage implements FileStorage {
  private readonly root: string;

  constructor(
    dir: string,
    private readonly baseUrl: string,
  ) {
    this.root = resolve(dir);
  }

  /** The file's path, refusing any key that would step outside the folder. */
  private path(key: string): string {
    const full = resolve(join(this.root, key));
    if (!full.startsWith(this.root + sep)) throw new Error("file key outside storage");
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.path(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async read(key: string): Promise<Buffer | null> {
    return readFile(this.path(key)).catch(() => null);
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

export const fileStorageProvider: Provider = {
  provide: FILE_STORAGE,
  useFactory: (): FileStorage => {
    const env = getEnv();
    return new LocalFileStorage(env.FILES_DIR, env.FILES_PUBLIC_URL ?? `http://localhost:${env.PORT}/files`);
  },
};
