<?php



final class FileUploadRules {
    public bool $uploaded = FALSE;
    public bool $error = FALSE;
    public string $error_message = "";
    public string $fileName = "";
    public string $fullPath = "";

    public function __construct(
      public readonly string  $uploadDir,
      public readonly string  $key,
      public readonly array   $allowedFileExtensions,
      public readonly ?string $forceFileName = NULL,
      public readonly bool    $replace = FALSE,
      public readonly bool    $keepHistory = FALSE,
      public readonly bool    $createUploadDir = true,
      public readonly bool    $required = FALSE
    ) {}
}

final class UploadFile{
    public static array $IMAGE_EXTENSIONS = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
    ];

    public static array $IMAGE_MIME_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
    ];

    public static array $DOCUMENT_EXTENSIONS = [
        // Text and PDF
      '.txt', '.pdf',
        // Microsoft Word
      '.doc', '.docx', '.docm', '.dot', '.dotx',
        // Microsoft Excel
      '.xls', '.xlsx', '.xlsm', '.xlt', '.xltx',
        // Microsoft PowerPoint
      '.ppt', '.pptx', '.pptm', '.pot', '.potx',
    ];

    public static array $DOCUMENT_MIME_TYPES = [
        // Text and PDF
      'text/plain',
      'application/pdf',
        // Microsoft Word
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-word.document.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
        // Microsoft Excel
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
        // Microsoft PowerPoint
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.presentationml.template',
    ];

    // Combined arrays for convenience
    public static array $ALL_SUPPORTED_EXTENSIONS = [
        // Images
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
        // Text and PDF
      '.txt', '.pdf',
        // Microsoft Word
      '.doc', '.docx', '.docm', '.dot', '.dotx',
        // Microsoft Excel
      '.xls', '.xlsx', '.xlsm', '.xlt', '.xltx',
        // Microsoft PowerPoint
      '.ppt', '.pptx', '.pptm', '.pot', '.potx',
    ];

    public static array $ALL_SUPPORTED_MIME_TYPES = [
        // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
        // Text and PDF
      'text/plain',
      'application/pdf',
        // Microsoft Word
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-word.document.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
        // Microsoft Excel
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
        // Microsoft PowerPoint
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
      'application/vnd.openxmlformats-officedocument.presentationml.template',
    ];

    /**
     * Creates an HTML hidden input for MAX_FILE_SIZE
     * Must be placed BEFORE the file input element
     * Uses php.ini upload_max_filesize by default
     *
     * @param int|string|null $size Size in bytes, KB (e.g., '2M', '2048K', '2097152'), null for php.ini value
     * @return string HTML hidden input
     */
    public static function maxFileSize(int|string|null $size = NULL): string {
        // If no size specified, use php.ini upload_max_filesize
        if($size === NULL) {
            $size = ini_get('upload_max_filesize');
        }

        // Convert string notation to bytes
        if(is_string($size)) {
            $size = trim(strtoupper($size));
            $last = substr($size, -1);
            $number = (int)substr($size, 0, -1);

            $size = match ($last) {
                'K' => $number * 1024,
                'M' => $number * 1024 * 1024,
                'G' => $number * 1024 * 1024 * 1024,
                default => (int)$size // Assume bytes if no unit
            };
        }

        return sprintf(
          '<input type="hidden" name="MAX_FILE_SIZE" value="%d" />',
          $size
        );
    }

    /**
     * Helper for HTML5 accept attribute
     */
    public static function accept(array $extensions = [], array $mimeTypes = []): string {
        // For best cross-browser compatibility, we'll use only extensions if provided
        if(!empty($extensions)) {
            $accepts = [];
            foreach($extensions as $ext) {
                $ext = trim($ext);
                if($ext === '') continue;
                $accepts[] = str_starts_with($ext, '.') ? $ext : '.' . $ext;
            }
            return empty($accepts) ? '' : 'accept="' . implode(',', $accepts) . '"';
        }

        // Fall back to MIME types only if no extensions are provided
        if(!empty($mimeTypes)) {
            $accepts = array_filter(array_map('trim', $mimeTypes));
            return empty($accepts) ? '' : 'accept="' . implode(',', $accepts) . '"';
        }

        return '';
    }

    private const ALLOWED_MIME_TYPES = [
        // Images
      'image/jpeg' => ['.jpg', '.jpeg'],
      'image/png' => ['.png'],
      'image/gif' => ['.gif'],
      'image/webp' => ['.webp'],
      'image/bmp' => ['.bmp'],
      'image/svg+xml' => ['.svg'],
        // Documents
      'application/pdf' => ['.pdf'],
      'text/plain' => ['.txt'],
        // Microsoft Word
      'application/msword' => ['.doc', '.dot'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['.docx'],
      'application/vnd.ms-word.document.macroEnabled.12' => ['.docm'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template' => ['.dotx'],
        // Microsoft Excel
      'application/vnd.ms-excel' => ['.xls', '.xlt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12' => ['.xlsm'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.template' => ['.xltx'],
        // Microsoft PowerPoint
      'application/vnd.ms-powerpoint' => ['.ppt', '.pot'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' => ['.pptx'],
      'application/vnd.ms-powerpoint.presentation.macroEnabled.12' => ['.pptm'],
      'application/vnd.openxmlformats-officedocument.presentationml.template' => ['.potx'],
    ];

    private function sanitizeFileName(string $fileName): string {
        // Remove file extension to process separately
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $name = pathinfo($fileName, PATHINFO_FILENAME);

        // Replace multiple spaces with single space and trim
        $name = trim(preg_replace('/\s+/', ' ', $name));

        // Replace spaces with underscores
        $name = str_replace(' ', '_', $name);

        // Remove diacritics and accents
        //$name = transliterator_transliterate('Any-Latin; Latin-ASCII', $name);

        // Replace dangerous characters with underscore
        $name = preg_replace('/[\/\\\|#&%!?<>]/', '_', $name);

        // Ensure name starts with letter or digit
        if(!preg_match('/^[a-zA-Z0-9]/', $name)) {
            $name = '_' . $name;
        }

        // Replace multiple consecutive underscores with single underscore
        $name = preg_replace('/_+/', '_', $name);

        return $name . '.' . $extension;
    }

    private function isValidUpload(array $file, FileUploadRules $rule): bool {
        if(!isset($file['error']) || is_array($file['error'])) {
            $rule->error = TRUE;
            $rule->error_message = 'Invalid file upload parameters';
            return FALSE;
        }

        if($file['error'] !== UPLOAD_ERR_OK) {
            $rule->error = TRUE;
            $rule->error_message = match ($file['error']) {
                UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'File upload stopped by extension',
                default => 'Unknown upload error'
            };
            return FALSE;
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if(!in_array('.' . $extension, $rule->allowedFileExtensions, TRUE)) {
            $rule->error = TRUE;
            $rule->error_message = 'File extension not allowed';
            return FALSE;
        }

        // MIME type validation
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        $validExtensions = self::ALLOWED_MIME_TYPES[$mimeType] ?? [];

        if(!empty($validExtensions) && !in_array('.' . $extension, $validExtensions, TRUE)) {
            $rule->error = TRUE;
            $rule->error_message = 'File type does not match its extension';
            return FALSE;
        }

        return TRUE;
    }

    private function getUniqueFileName(string $targetPath, string $baseName, string $extension): string {
        if(!file_exists($targetPath)) {
            return $baseName . '.' . $extension;
        }

        $counter = 1;
        do {
            $newName = $baseName . '_' . $counter . '.' . $extension;
            $newPath = dirname($targetPath) . DIRECTORY_SEPARATOR . $newName;
            $counter++;
        } while(file_exists($newPath));

        return $newName;
    }

    private function createHistoryCopy(string $sourcePath, string $targetDir, string $baseName, string $extension): bool {
        $timestamp = date('Y_m_d_H_i_s_') . bin2hex(random_bytes(4));
        $historyName = $baseName . '_' . $timestamp . '.' . $extension;
        $historyPath = $targetDir . DIRECTORY_SEPARATOR . $historyName;

        return copy($sourcePath, $historyPath);
    }

    public function upload(array $rules): int {
        $errorCount = 0;

        foreach($rules as $rule) {
            if(!is_dir($rule->uploadDir)) {
                if($rule->createUploadDir) {
                    if(!mkdir($rule->uploadDir, 0755, TRUE)) {
                        $rule->error = TRUE;
                        $rule->error_message = 'Failed to create upload directory: ' . $rule->uploadDir;
                        echo $rule->error_message;
                        $errorCount++;
                        continue;
                    }
                } else {
                    $rule->error = TRUE;
                    $rule->error_message = 'Upload directory does not exist';
                    $errorCount++;
                    continue;
                }
            }

            if(!is_writable($rule->uploadDir)) {
                $rule->error = TRUE;
                $rule->error_message = 'Upload directory is not writable';
                $errorCount++;
                continue;
            }

            if(!isset($_FILES[$rule->key])) {
                if($rule->required) {
                    $rule->error = TRUE;
                    $rule->error_message = 'No file uploaded for key: ' . $rule->key;
                    $errorCount++;
                } else {
                    $rule->error = FALSE;
                    $rule->error_message = 'Not uploaded';
                }
                continue;
            }

            $file = $_FILES[$rule->key];

            if(!$this->isValidUpload($file, $rule)) {
                $errorCount++;
                continue;
            }

            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $baseName = $rule->forceFileName
              ? pathinfo($rule->forceFileName, PATHINFO_FILENAME)
              : pathinfo($file['name'], PATHINFO_FILENAME);

            $sanitizedBaseName = $this->sanitizeFileName($baseName);
            $fileName = $sanitizedBaseName . '.' . $extension;
            $targetPath = $rule->uploadDir . DIRECTORY_SEPARATOR . $fileName;

            if(file_exists($targetPath) && !$rule->replace) {
                $fileName = $this->getUniqueFileName($targetPath, $sanitizedBaseName, $extension);
                $targetPath = $rule->uploadDir . DIRECTORY_SEPARATOR . $fileName;
            }

            $tmpPath = tempnam(sys_get_temp_dir(), 'upload_');
            if(!move_uploaded_file($file['tmp_name'], $tmpPath)) {
                $rule->error = TRUE;
                $rule->error_message = 'Failed to move uploaded file to temporary location';
                $errorCount++;
                continue;
            }

            if($rule->keepHistory) {
                if(!$this->createHistoryCopy($tmpPath, $rule->uploadDir, $sanitizedBaseName, $extension)) {
                    $rule->error = TRUE;
                    $rule->error_message = 'Failed to create history copy';
                    $errorCount++;
                    unlink($tmpPath);
                    continue;
                }
            }

            if(!rename($tmpPath, $targetPath)) {
                $rule->error = TRUE;
                $rule->error_message = 'Failed to move file to target location';
                $errorCount++;
                unlink($tmpPath);
                continue;
            }

            $rule->uploaded = TRUE;
            $rule->fileName = $fileName;
            $rule->fullPath = $targetPath;
        }

        return $errorCount;
    }
}
