import { Controller, Get, Inject, NotFoundException, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { InvalidInputException } from "../errors";
import { CurrentStore, MerchantStoreGuard, type MerchantStore } from "../merchant/store.guard";
import { contentTypeOfKey, detectPhotoType, MAX_PHOTO_BYTES, newPhotoKey } from "./photos";
import { FILE_STORAGE, type FileStorage } from "./storage";
import { RATE_LIMITER, type RateLimiter } from "../security/rate-limit";

interface FileResponse {
  setHeader(name: string, value: string): unknown;
  end(data: Buffer): unknown;
}

@Controller()
export class FilesController {
  constructor(
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    @Inject(RATE_LIMITER) private readonly limits: RateLimiter,
  ) {}

  /**
   * One photo (a product photo or the shop logo), already compressed by the
   * browser. Checked by its bytes, saved in the store's own folder; the form
   * then saves its key with the product.
   */
  @Post("uploads/photo")
  @UseGuards(MerchantStoreGuard)
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }))
  async upload(@CurrentStore() { storeId }: MerchantStore, @UploadedFile() file: { buffer: Buffer } | undefined) {
    await this.limits.hit("photoUpload", storeId);
    if (!file) throw new InvalidInputException({ file: "photo_required" });
    const type = detectPhotoType(file.buffer);
    if (!type) throw new InvalidInputException({ file: "photo_required" });
    const key = newPhotoKey(storeId, type);
    await this.storage.put(key, file.buffer, type);
    return { key, url: this.storage.publicUrl(key) };
  }

  /** Development only: serves photos from the local folder (production serves them from R2). */
  @Get("files/stores/:storeId/:name")
  async serve(@Param("storeId") storeId: string, @Param("name") name: string, @Res() res: FileResponse) {
    const key = `stores/${storeId}/${name}`;
    const type = contentTypeOfKey(key);
    if (!/^[0-9a-f-]{36}$/.test(storeId) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name) || !type) throw new NotFoundException();
    const data = await this.storage.read(key);
    if (!data) throw new NotFoundException();
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(data);
  }
}
