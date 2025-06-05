<?php
namespace Ocallit\Util;

/**
 * Example usage:
 *
 * // 1. Upload image with rename and history
 * $result = FileUploader::uploadImageWithRename('profile_pic', 'D:\Apache2.4.33\htdocs\Ocallit\uploads\images', 'user_123_profile');
 * if ($result->isSuccess()) {
 *     echo "File uploaded successfully as: " . $result->getFileName();
 * } else {
 *     echo "Upload failed: " . $result->getErrorMessage();
 * }
 *
 * // 2. Upload document with sanitized name, no history
 * $result = FileUploader::uploadDocumentWithSanitizedNameNoHistory('resume', 'D:\Apache2.4.33\htdocs\Ocallit\uploads\documents');
 * if($result->isSuccess()) {
 *     echo "File uploaded successfully as: " . $result->getFileName();
 * } else {
 *     echo "Upload failed: " . $result->getErrorMessage();
 * }
 *
 * // 3. Using dynamic path resolution
 * $uploadPath = $_SERVER['DOCUMENT_ROOT'] . '\uploads\images';
 * $result = FileUploader::uploadImageWithRename('profile_pic', $uploadPath, 'user_123_profile');
 */

/**
 * Class representing the result of a file upload operation
 */
final class UploadResult {
    public function __construct(
      public readonly bool   $success,
      public readonly string $fileName = '',
      public readonly string $errorMessage = '',
      public readonly string $fullPath = ''
    ) {}

    public function isSuccess(): bool {return $this->success; }

    public function getFileName(): string {return $this->fileName; }

    public function getErrorMessage(): string {return $this->errorMessage; }

    public function getFullPath(): string {return $this->fullPath; }
}

/**
 * Main file upload class with core functionality
 */
final class FileUploader {
    // Supported file extensions by type
    public static array $IMAGE_EXTENSIONS = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
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

    // Mapping of MIME types to allowed extensions for validation
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

    /**
     * Creates an HTML hidden input for MAX_FILE_SIZE
     * Must be placed BEFORE the file input element
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
     *
     * @param array $extensions File extensions to accept
     * @param array $mimeTypes MIME types to accept
     * @return string HTML accept attribute
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

    /**
     * Upload a file with specified parameters
     *
     * @param string $key Form field name
     * @param string $uploadDir Full path to upload directory
     * @param array $allowedExtensions Allowed file extensions
     * @param string|null $forceFileName New filename (without extension) or null to use original
     * @param bool $fileExistsBehavior Whether to replace or version existing files when uploladed
     * @param bool $keepHistory Whether to keep a history copy
     * @param bool $createUploadDir Whether to create the upload directory if it doesn't exist
     * @param bool $required Whether the file is required
     * @return UploadResult Result of the upload operation
     */
    public static function upload(
      string  $key,
      string  $uploadDir,
      array   $allowedExtensions,
      ?string $forceFileName = NULL,
      bool    $fileExistsBehavior = TRUE,
      bool    $keepHistory = FALSE,
      bool    $createUploadDir = TRUE,
      bool    $required = FALSE
    ): UploadResult {
        // Check if upload directory exists
        if(!is_dir($uploadDir)) {
            if($createUploadDir) {
                if(!mkdir($uploadDir, 0755, TRUE)) {
                    return new UploadResult(
                      FALSE,
                      '',
                      "Failed to create upload directory: $uploadDir"
                    );
                }
            } else {
                return new UploadResult(
                  FALSE,
                  '',
                  "Upload directory does not exist: $uploadDir"
                );
            }
        }

        // Check if directory is writable
        if(!is_writable($uploadDir)) {
            return new UploadResult(
              FALSE,
              '',
              "Upload directory is not writable: $uploadDir"
            );
        }

        // Check if file was uploaded
        if(!isset($_FILES[$key])) {
            if($required) {
                return new UploadResult(
                  FALSE,
                  '',
                  "No file uploaded for field: $key"
                );
            } else {
                return new UploadResult(
                  FALSE,
                  '',
                  "No file uploaded (optional)"
                );
            }
        }

        $file = $_FILES[$key];

        // Validate upload
        if(!isset($file['error']) || is_array($file['error'])) {
            return new UploadResult(
              FALSE,
              '',
              "Invalid file upload parameters"
            );
        }

        // Check for PHP upload errors
        if($file['error'] !== UPLOAD_ERR_OK) {
            $errorMessage = match ($file['error']) {
                UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'File upload stopped by extension',
                default => 'Unknown upload error'
            };

            return new UploadResult(FALSE, '', $errorMessage);
        }

        // Validate file extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if(!in_array('.' . $extension, $allowedExtensions, TRUE)) {
            return new UploadResult(
              FALSE,
              '',
              "File extension not allowed: .$extension"
            );
        }


//        // MIME type validation
//        $finfo = new finfo(FILEINFO_MIME_TYPE);
//        $mimeType = $finfo->file($file['tmp_name']);
//        $validExtensions = self::ALLOWED_MIME_TYPES[$mimeType] ?? [];
//
//        if(!empty($validExtensions) && !in_array('.' . $extension, $validExtensions, TRUE)) {
//            return new UploadResult(
//              FALSE,
//              '',
//              "File type does not match its extension"
//            );
//        }

        // Determine base filename
        $baseName = $forceFileName
          ? pathinfo($forceFileName, PATHINFO_FILENAME)
          : pathinfo($file['name'], PATHINFO_FILENAME);

        // Sanitize filename
        $sanitizedBaseName = self::sanitizeFileName($baseName);
        $fileName = $sanitizedBaseName . '.' . $extension;
        $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $fileName;

        // Handle existing files
        if(file_exists($targetPath) && !$fileExistsBehavior) {
            $fileName = self::getUniqueFileName($targetPath, $sanitizedBaseName, $extension);
            $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $fileName;
        }

        // Create temporary file
        $tmpPath = tempnam(sys_get_temp_dir(), 'upload_');
        if(!move_uploaded_file($file['tmp_name'], $tmpPath)) {
            return new UploadResult(
              FALSE,
              '',
              "Failed to move uploaded file to temporary location"
            );
        }

        // Create history copy if needed
        if($keepHistory) {
            if(!self::createHistoryCopy($tmpPath, $uploadDir, $sanitizedBaseName, $extension)) {
                unlink($tmpPath);
                return new UploadResult(
                  FALSE,
                  '',
                  "Failed to create history copy"
                );
            }
        }

        // Move file to final destination
        if(!rename($tmpPath, $targetPath)) {
            unlink($tmpPath);
            return new UploadResult(
              FALSE,
              '',
              "Failed to move file to target location"
            );
        }

        // Success
        return new UploadResult(
          TRUE,
          $fileName,
          '',
          $targetPath
        );
    }

    /**
     * Sanitize a filename to make it safe for storage
     *
     * @param string $fileName Filename to sanitize
     * @return string Sanitized filename
     */
    private static function sanitizeFileName(string $fileName): string {
        // Remove file extension to process separately
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $name = pathinfo($fileName, PATHINFO_FILENAME);

        // Replace multiple spaces with single space and trim
        $name = trim(preg_replace('/\s+/', ' ', $name));

        // Replace spaces with underscores
        $name = str_replace(' ', '_', $name);

        // Replace dangerous characters with underscore
        $name = preg_replace('/[\/\\\|#&%!?<>]/', '_', $name);

        // Ensure name starts with letter or digit
        if(!preg_match('/^[a-zA-Z0-9]/', $name)) {
            $name = '_' . $name;
        }

        // Replace multiple consecutive underscores with a single underscore
        $name = preg_replace('/_+/', '_', $name);

        return $extension ? "$name.$extension" : $name;
    }

    /**
     * Generate a unique filename if the target file already exists
     *
     * @param string $targetPath Full path to the target file
     * @param string $baseName Base filename (without extension)
     * @param string $extension File extension (without dot)
     * @return string Unique filename
     */
    private static function getUniqueFileName(string $targetPath, string $baseName, string $extension): string {
        if(!file_exists($targetPath)) {
            return "$baseName.$extension";
        }

        $counter = 1;
        do {
            $newName = "{$baseName}_{$counter}.{$extension}";
            $newPath = dirname($targetPath) . DIRECTORY_SEPARATOR . $newName;
            $counter++;
        } while(file_exists($newPath));

        return $newName;
    }

    /**
     * Create a history copy of the uploaded file
     *
     * @param string $sourcePath Source file path
     * @param string $targetDir Target directory
     * @param string $baseName Base filename (without extension)
     * @param string $extension File extension (without dot)
     * @return bool Whether the history copy was created successfully
     */
    private static function createHistoryCopy(string $sourcePath, string $targetDir, string $baseName, string $extension): bool {
        $timestamp = date('Y_m_d_H_i_s_') . bin2hex(random_bytes(4));
        $historyName = "{$baseName}_{$timestamp}.{$extension}";
        $historyPath = $targetDir . DIRECTORY_SEPARATOR . $historyName;

        return copy($sourcePath, $historyPath);
    }

    /**
     * Upload an image file, rename it to specified name (with uploaded extension)
     * Overwrites if it exists and creates a history copy
     *
     * @param string $key The form field name
     * @param string $uploadDir Full path to upload directory
     * @param string $renameTo New name for the file (without extension)
     * @return UploadResult Object containing success status, filename, and error message
     */
    public static function uploadImageWithRename(string $key, string $uploadDir, string $renameTo): UploadResult {
        return self::upload(
          $key,
          $uploadDir,
          self::$IMAGE_EXTENSIONS,
          $renameTo,
          TRUE,
          TRUE,
          TRUE,
          TRUE
        );
    }

    /**
     * Upload an image file, rename it to specified name (with uploaded extension)
     * Overwrites if it exists but does NOT create a history copy
     *
     * @param string $key The form field name
     * @param string $uploadDir Full path to upload directory
     * @param string $renameTo New name for the file (without extension)
     * @return UploadResult Object containing success status, filename, and error message
     */
    public static function uploadImageWithRenameNoHistory(string $key, string $uploadDir, string $renameTo): UploadResult {
        return self::upload(
          $key,
          $uploadDir,
          self::$IMAGE_EXTENSIONS,
          $renameTo,
          TRUE,
          FALSE,
          TRUE,
          TRUE
        );
    }

    /**
     * Upload an image file, sanitize the original filename
     * Overwrites if it exists and creates a history copy
     *
     * @param string $key The form field name
     * @param string $uploadDir Full path to upload directory
     * @return UploadResult Object containing success status, filename, and error message
     */
    public static function uploadImageWithSanitizedName(string $key, string $uploadDir): UploadResult {
        return self::upload(
          $key,
          $uploadDir,
          self::$IMAGE_EXTENSIONS,
          NULL,
          TRUE,
          TRUE,
          TRUE,
          TRUE
        );
    }

    /**
     * Upload an image file, sanitize the original filename
     * Overwrites if it exists but does NOT create a history copy
     *
     * @param string $key The form field name
     * @param string $uploadDir Full path to upload directory
     * @return UploadResult Object containing success status, filename, and error message
     */
    public static function uploadImageWithSanitizedNameNoHistory(string $key, string $uploadDir): UploadResult {
        return self::upload(
          $key,
          $uploadDir,
          self::$IMAGE_EXTENSIONS,
          NULL,
          TRUE,
          FALSE,
          TRUE,
          TRUE
        );
    }

    /**
     * Upload a document file (image, pdf, txt, csv, office document), rename it to specified name
     * Overwrites if it exists and creates a history copy
     *
     * @param string $key The form field name
     * @param string $uploadDir Full path to upload directory
     * @param string $renameTo New name for the file (without extension)
     * @return UploadResult Object containing success status, filename, and error message
     */
    public static function uploadDocumentWithRename(string $key, string $uploadDir, string $renameTo): UploadResult {
        $allowedExtensions = array_merge(
          self::$IMAGE_EXTENSIONS,
          self::$DOCUMENT_EXTENSIONS
        );

        return self::upload(
          $key,
          $uploadDir,
          $allowedExtensions,
          $renameTo,
          TRUE,
          TRUE,
          TRUE,
          TRUE
        );
    }

    /**
     * Upload a document file (image, pdf, txt, csv, office document), rename it to specified name
     * Overwrites if it exists but does NOT create a history copy
     *
     * @param string $key The form field name
     * @param string $uploadDir Full path to upload directory
     * @param string $renameTo New name for the file (without extension)
     * @return UploadResult Object containing success status, filename, and error message
     */
    public static function uploadDocumentWithRenameNoHistory(string $key, string $uploadDir, string $renameTo): UploadResult {
        $allowedExtensions = array_merge(
          self::$IMAGE_EXTENSIONS,
          self::$DOCUMENT_EXTENSIONS
        );

        return self::upload(
          $key,
          $uploadDir,
          $allowedExtensions,
          $renameTo,
          TRUE,
          FALSE,
          TRUE,
          TRUE
        );
    }

    /**
     * Upload a document file (image, pdf, txt, csv, office document), sanitize the original filename
     * Overwrites if it exists and creates a history copy
     *
     * @param string $key The form field name
     * @param string $uploadDir Full path to upload directory
     * @return UploadResult Object containing success status, filename, and error message
     */
    public static function uploadDocumentWithSanitizedName(string $key, string $uploadDir): UploadResult {
        $allowedExtensions = array_merge(
          self::$IMAGE_EXTENSIONS,
          self::$DOCUMENT_EXTENSIONS
        );

        return self::upload(
          $key,
          $uploadDir,
          $allowedExtensions,
          NULL,
          TRUE,
          TRUE,
          TRUE,
          TRUE
        );
    }

    /**
     * Upload a document file (image, pdf, txt, csv, office document), sanitize the original filename
     * Overwrites if it exists but does NOT create a history copy
     *
     * @param string $key The form field name
     * @param string $uploadDir Full path to upload directory
     * @return UploadResult Object containing success status, filename, and error message
     */
    public static function uploadDocumentWithSanitizedNameNoHistory(string $key, string $uploadDir): UploadResult {
        $allowedExtensions = array_merge(
          self::$IMAGE_EXTENSIONS,
          self::$DOCUMENT_EXTENSIONS
        );

        return self::upload(
          $key,
          $uploadDir,
          $allowedExtensions,
          NULL,
          TRUE,
          FALSE,
          TRUE,
          TRUE
        );
    }
}

