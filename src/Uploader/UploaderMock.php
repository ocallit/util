<?php
require_once __DIR__ . '/../Uploader.php';

class UploaderMock extends FileUploader
{
    public function callResolveUploadPath(string $path, string $type): string {
        return $this->resolveUploadPath($path, $type);
    }

    public function callNormalizeFilesArray(array $fileData): array {
        return $this->normalizeFilesArray($fileData);
    }

    public function callConvertToBytes(string $val): int {
        return $this->convertToBytes($val);
    }

    public function callSanitizeFilename(string $val): string {
        return $this->sanitizeFilename($val);
    }

    public function callValidateExtension(string $ext, array $valid): bool {
        return $this->validateExtension($ext, $valid);
    }

    public function callValidateMimeType(string $filePath, array $valid): bool {
        return $this->validateMimeType($filePath, $valid);
    }

    public function callGetUploadErrorMessage(int $code): string {
        return $this->getUploadErrorMessage($code);
    }
}
