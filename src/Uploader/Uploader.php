<?php
/*
 * dudas *** prioridad alta.
 *   1. audit image a otro directorio?
 *   2. *** permiso directorio creado, chmod se puede?
 *   3. *** acepta D:\... en path?
 *   4. ** EXT faltantes
 *   5 checa bang! !php
 *   6 *** hacer phpunit test de lo que si se pueda: getFormEnctype,getMaxFileSizeInput,getAcceptAttribute, resolveUploadPath, normalizeFilesArray, convertToBytes,sanitizeFilename,validateExtension,validateMimeType,getUploadErrorMessage
 *   7 *** getMaxFileSizeInput dejar input null y lo deduce? o tener el valor default en un proerty de 5Mb
 *   8.* properties para procesar images o no a) cambiar tamaño si mas grande de, b) convertir a webp o png o jpg, c) quitar EXIF, quitar metadatos?, e) hacer thumbnail de sizer
 */


/**
 * FileUploader class
 * @see https://www.php.net/manual/en/features.file-upload.php
 */
class FileUploader {
    /*
     * umask values
     *    Directory: 777 - 002 = 775 (rwxrwxr-x)
     *    File: 666 - 002 = 664 (rw-rw-r--)
     */
    // Default umask for directory creation (u=rwx,g=rwx,o=r-x)
    public int $directoryUmask = 0775;
    // Default umask for file creation (u=rwx,g=rwx,o=r-x)
    public int $filePermission = 0664;

    public const EXT_WEB_IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    public const EXT_IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
    public const EXT_DOCUMENTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp'];
    public const EXT_ARCHIVES = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
    public const EXT_AUDIO = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
    public const EXT_VIDEO = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
    public const EXT_TEXT = ['txt', 'csv', 'json', 'xml', 'md', 'log'];


    // Path type constants for explicit path handling
    public const PATH_FROM_WEB_ROOT = 'web_root';
    public const PATH_FROM_SCRIPT = 'script_relative';
    public const PATH_ABSOLUTE = 'absolute';

    // Common MIME type mappings - NOTE: Never trust client-provided MIME types!
    protected array $mimeTypes = [
      'jpg' => 'image/jpeg',
      'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'gif' => 'image/gif',
      'webp' => 'image/webp',
      'svg' => 'image/svg+xml',
      'bmp' => 'image/bmp',
      'pdf' => 'application/pdf',
      'doc' => 'application/msword',
      'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls' => 'application/vnd.ms-excel',
      'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt' => 'application/vnd.ms-powerpoint',
      'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt' => 'text/plain',
      'csv' => 'text/csv',
      'zip' => 'application/zip',
      'mp3' => 'audio/mpeg',
      'mp4' => 'video/mp4',
    ];

    /**
     * Get correct enctype for file upload forms
     */
    public function getFormEnctype(): string {return 'multipart/form-data';}


    /**
     * Get HTML hidden input for max file size
     */
    public function getMaxFileSizeInput(int $maxSizeBytes): string {
        return '<input type="hidden" name="MAX_FILE_SIZE" value="' . $maxSizeBytes . '">';
    }

    /**
     * Get accept attribute for file input based on extensions
     */
    public function getAcceptAttribute(array $extensions): string {
        $mimeTypes = [];
        $extList = [];

        foreach($extensions as $ext) {
            $ext = strtolower($ext);
            $extList[] = '.' . $ext;
            $mime = $this->mimeTypes[$ext] ?? null;
            if($mime) {
                $mimeTypes[] = $mime;
            }
        }
        // Combine MIME types and extensions for maximum browser compatibility
        $accepts = array_merge($mimeTypes, $extList);
        return implode(',', array_unique($accepts));
    }

    /**
     * Configure PHP settings for file uploads
     */
    public function configurePhpSettings(
      string $maxFileSize = '10M',
      string $maxPostSize = '50M',
      int|string $maxFileUploads = 20,
      string $memoryLimit = "512M"
    ): void {
        ini_set('upload_max_filesize', $maxFileSize);
        ini_set('post_max_size', $maxPostSize);
        ini_set('max_file_uploads', (string)$maxFileUploads);
        ini_set('memory_limit', $memoryLimit);
        ini_set('file_uploads', '1');
    }


    /**
     * Convert path to full file system path based on path type
     */
    protected function resolveUploadPath(string $path, string $pathType): string {
        switch($pathType) {
            case self::PATH_ABSOLUTE:
                // Already absolute - validate and return as-is
                return $this->validateAbsolutePath($path);

            case self::PATH_FROM_WEB_ROOT:
                // Convert from web root to full system path
                $webRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
                if(empty($webRoot)) {
                    throw new InvalidArgumentException('DOCUMENT_ROOT not available for web root paths');
                }
                return rtrim($webRoot, '/\\') . DIRECTORY_SEPARATOR . ltrim($path, '/\\');

            case self::PATH_FROM_SCRIPT:
                // Relative to the calling script's directory
                $scriptDir = dirname($_SERVER['SCRIPT_FILENAME'] ?? __FILE__);
                return $scriptDir . DIRECTORY_SEPARATOR . ltrim($path, './\\');

            default:
                throw new InvalidArgumentException("Invalid path type: $pathType. Use PATH_* constants.");
        }
    }

    /**
     * Validate and normalize absolute paths
     */
    protected function validateAbsolutePath(string $path): string {
        // Windows absolute paths
        if(PHP_OS_FAMILY === 'Windows') {
            if(preg_match('/^[A-Za-z]:[\\\/]/', $path)) {
                return str_replace('/', DIRECTORY_SEPARATOR, $path);
            }
            // UNC paths
            if(str_starts_with($path, '\\\\') || str_starts_with($path, '//')) {
                return str_replace('/', DIRECTORY_SEPARATOR, $path);
            }
        }

        // Unix absolute paths
        if(str_starts_with($path, '/')) {
            return $path;
        }

        throw new InvalidArgumentException("Invalid absolute path format: $path");
    }

    /**
     * Normalize $_FILES array for both single and multiple uploads
     */
    protected function normalizeFilesArray(array $fileData): array {
        // Check if it's multiple file upload format
        if(isset($fileData['name']) && is_array($fileData['name'])) {
            $files = [];
            $count = count($fileData['name']);

            for($i = 0; $i < $count; $i++) {
                $files[] = [
                  'name' => $fileData['name'][$i] ?? '',
                  'type' => $fileData['type'][$i] ?? '',
                  'tmp_name' => $fileData['tmp_name'][$i] ?? '',
                  'error' => $fileData['error'][$i] ?? UPLOAD_ERR_NO_FILE,
                  'size' => $fileData['size'][$i] ?? 0,
                ];
            }

            return $files;
        }

        // Single file upload format
        return [$fileData];
    }

    protected function convertToBytes(string $size): int {
        $size = trim($size);
        $unit = strtolower(substr($size, -1));
        $value = (int)substr($size, 0, -1);

        return match ($unit) {
            'k' => $value * 1024,
            'm' => $value * 1024 * 1024,
            'g' => $value * 1024 * 1024 * 1024,
            default => (int)$size
        };
    }

    /**
     * Sanitize filename according to security best practices
     */
    protected function sanitizeFilename(string $filename): string {
        // Remove path information first - critical for security
        $filename = basename($filename);

        // Remove dangerous characters that could cause issues (added missing >)
        $filename = preg_replace('/[\/\\\,;|><&"\'`\t\r\n\0\x00-\x1f\x7f]/', '', $filename);

        // Remove multiple spaces and trim
        $filename = preg_replace('/\s+/', ' ', trim($filename));

        // Replace dots at start with underscores (case many dots at start)
        while(str_starts_with($filename, '.')) {
            $filename = '_' . substr($filename, 1);
        }

        // Ensure we have a filename
        if(empty($filename)) {
            $filename = 'file';
        }

        return $filename;
    }

    /**
     * Create directory if it doesn't exist with proper permissions
     */
    protected function createDirectory(string $path): bool {
        if(!is_dir($path)) {
            return mkdir($path, $this->directoryUmask, TRUE);
        }
        return TRUE;
    }

    /**
     * Get unique filename with suffix if needed
     */
    protected function getUniqueFilename(string $directory, string $filename, bool $allowOverwrite): string {
        $fullPath = rtrim($directory, '/\\') . DIRECTORY_SEPARATOR . $filename;

        if(!file_exists($fullPath) || $allowOverwrite) {
            return $filename;
        }

        $pathInfo = pathinfo($filename);
        $name = $pathInfo['filename'];
        $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';

        // Try suffixes from 001 to 999
        for($i = 1; $i <= 999; $i++) {
            $suffix = sprintf('_%03d', $i);
            $newFilename = $name . $suffix . $extension;
            $newFullPath = rtrim($directory, '/\\') . DIRECTORY_SEPARATOR . $newFilename;

            if(!file_exists($newFullPath)) {
                return $newFilename;
            }
        }

        // If we get here, we couldn't find a unique name
        throw new RuntimeException('No se pudo generar un nombre único para el archivo');
    }


    /**
     * Validate file extension using whitelist approach
     */
    protected function validateExtension(string $extension, array $validExtensions): bool {
        return in_array(strtolower($extension), array_map('strtolower', $validExtensions));
    }

    /**
     * Validate MIME type using file inspection (not client-provided type)
     * As per PHP docs: $_FILES['userfile']['type'] is USELESS for security
     */
    protected function validateMimeType(string $filePath, array $validMimeTypes): bool {
        if(empty($validMimeTypes)) {
            return TRUE;
        }

        // Use finfo to detect actual MIME type from file content
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if($finfo === FALSE) {
            return FALSE;
        }

        $detectedMimeType = finfo_file($finfo, $filePath);
        finfo_close($finfo);

        return in_array($detectedMimeType, $validMimeTypes);
    }

    /**
     * Additional security check: validate if file is actually an image
     * Uses getimagesize() as recommended in PHP docs
     */
    protected function validateImageFile(string $filePath): bool {
        $imageInfo = getimagesize($filePath);
        return $imageInfo !== FALSE;
    }

    /**
     * Check if uploaded file passes is_uploaded_file() validation
     * Note: is_uploaded_file() is automatically called by move_uploaded_file()
     * This is kept for explicit validation if needed before moving
     */
    protected function isValidUploadedFile(string $filePath): bool {
        return is_uploaded_file($filePath);
    }


    /**
     * Get proper error message for upload errors
     */
    protected function getUploadErrorMessage(int $errorCode): string {
        return match ($errorCode) {
            UPLOAD_ERR_OK => '',
            UPLOAD_ERR_INI_SIZE => 'El archivo es demasiado grande (límite del servidor)',
            UPLOAD_ERR_FORM_SIZE => 'El archivo es demasiado grande (límite del formulario)',
            UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente',
            UPLOAD_ERR_NO_FILE => 'No se seleccionó ningún archivo',
            UPLOAD_ERR_NO_TMP_DIR => 'Falta la carpeta temporal',
            UPLOAD_ERR_CANT_WRITE => 'Error al escribir el archivo en disco',
            UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida del archivo',
            default => 'Error desconocido en la subida del archivo'
        };
    }

    /**
     * Main upload method with comprehensive security checks
     * Supports both single and multiple file uploads with explicit path types
     *
     * @param string $fileKey Key in $_FILES array
     * @param array $validExtensions Array of valid extensions (whitelist)
     * @param array $validMimeTypes Array of valid MIME types (optional)
     * @param string $uploadPath The upload path
     * @param string $pathType Path type: PATH_FROM_WEB_ROOT, PATH_FROM_SCRIPT, or PATH_ABSOLUTE
     * @param string|null $forcedName Force specific filename (null to use original, ignored for multiple files)
     * @param bool $createAuditTrace Create audit trace file with filename_yyyy_mm_dd_HH_ii.ext format
     * @param bool $allowOverwrite Allow overwriting existing files
     * @param int $maxFileSize Maximum file size in bytes
     * @param bool $isRequired Whether file is required
     * @return array Upload result (for multiple files, returns array of results)
     */
    public function upload(
      string  $fileKey,
      array   $validExtensions,
      array   $validMimeTypes = [],
      string  $uploadPath = 'uploads',
      string  $pathType = self::PATH_FROM_WEB_ROOT,
      ?string $forcedName = NULL,
      bool    $createAuditTrace = FALSE,
      bool    $allowOverwrite = FALSE,
      int     $maxFileSize = 10485760, // 10MB default
      bool    $isRequired = TRUE
    ): array {

        // Check if file was uploaded
        if(!isset($_FILES[$fileKey]) || empty($_FILES[$fileKey]['tmp_name'])) {
            if(!$isRequired) {
                return [
                  'ok' => TRUE,
                  'error' => 0,
                  'error_message' => '',
                  'uploaded_filename' => '',
                  'uploaded_extension' => '',
                  'uploaded_path' => '',
                  'user_uploaded_name' => '',
                  'file_size' => 0,
                ];
            }
            return [
              'ok' => FALSE,
              'error' => UPLOAD_ERR_NO_FILE,
              'error_message' => 'No se seleccionó ningún archivo',
              'uploaded_filename' => '',
              'uploaded_extension' => '',
              'uploaded_path' => '',
              'user_uploaded_name' => '',
              'file_size' => 0,
            ];
        }

        // Convert path to full system path based on type
        try {
            $fullUploadPath = $this->resolveUploadPath($uploadPath, $pathType);
        } catch(InvalidArgumentException $e) {
            return [
              'ok' => FALSE,
              'error' => 108,
              'error_message' => 'Error en la configuración de ruta: ' . $e->getMessage(),
              'uploaded_filename' => '',
              'uploaded_extension' => '',
              'uploaded_path' => '',
              'user_uploaded_name' => '',
              'file_size' => 0,
            ];
        }

        // Normalize files array (handles both single and multiple uploads)
        $files = $this->normalizeFilesArray($_FILES[$fileKey]);

        // For multiple files, process each one
        if(count($files) > 1) {
            $results = [];
            foreach($files as $index => $fileData) {
                $results[$index] = $this->processSingleFile(
                  $fileData,
                  $validExtensions,
                  $validMimeTypes,
                  $fullUploadPath,
                  NULL, // No forced name for multiple files
                  $createAuditTrace,
                  $allowOverwrite,
                  $maxFileSize
                );
            }
            return $results;
        }

        // Single file upload
        return $this->processSingleFile(
          $files[0],
          $validExtensions,
          $validMimeTypes,
          $fullUploadPath,
          $forcedName,
          $createAuditTrace,
          $allowOverwrite,
          $maxFileSize
        );
    }

    /**
     * Process a single file upload
     */
    protected function processSingleFile(
      array   $uploadedFile,
      array   $validExtensions,
      array   $validMimeTypes,
      string  $uploadPath,
      ?string $forcedName,
      bool    $createAuditTrace,
      bool    $allowOverwrite,
      int     $maxFileSize
    ): array {

        // Default result structure
        $result = [
          'ok' => FALSE,
          'error' => 0,
          'error_message' => '',
          'uploaded_filename' => '',
          'uploaded_extension' => '',
          'uploaded_path' => '',
          'user_uploaded_name' => '',
          'file_size' => 0,
        ];

        $result['user_uploaded_name'] = $uploadedFile['name'];
        $result['file_size'] = $uploadedFile['size'];

        // Check for upload errors first (as per PHP docs)
        if($uploadedFile['error'] !== UPLOAD_ERR_OK) {
            $result['error'] = $uploadedFile['error'];
            $result['error_message'] = $this->getUploadErrorMessage($uploadedFile['error']);
            return $result;
        }

        // Note: is_uploaded_file() check is redundant since move_uploaded_file() does it automatically
        // But keeping for explicit validation if needed
        if(!$this->isValidUploadedFile($uploadedFile['tmp_name'])) {
            $result['error'] = 100;
            $result['error_message'] = 'Archivo no válido para subida';
            return $result;
        }

        // Validate file size
        if($uploadedFile['size'] > $maxFileSize) {
            $result['error'] = 101;
            $result['error_message'] = 'El archivo es demasiado grande. Tamaño máximo: ' .
              $this->formatFileSize($maxFileSize);
            return $result;
        }

        // Get file extension
        $pathInfo = pathinfo($uploadedFile['name']);
        $extension = isset($pathInfo['extension']) ? strtolower($pathInfo['extension']) : '';
        $result['uploaded_extension'] = $extension;

        // Validate extension using whitelist (security best practice)
        if(!$this->validateExtension($extension, $validExtensions)) {
            $result['error'] = 102;
            $result['error_message'] = 'Tipo de archivo no permitido. Extensiones válidas: ' .
              implode(', ', $validExtensions);
            return $result;
        }

        // Validate MIME type using file inspection (not client data)
        if(!$this->validateMimeType($uploadedFile['tmp_name'], $validMimeTypes)) {
            $result['error'] = 103;
            $result['error_message'] = 'Tipo de archivo no válido según contenido';
            return $result;
        }

        // Additional validation for image files
        if(in_array($extension, self::EXT_WEB_IMAGES) && !$this->validateImageFile($uploadedFile['tmp_name'])) {
            $result['error'] = 104;
            $result['error_message'] = 'El archivo no es una imagen válida';
            return $result;
        }

        // Create upload directory with proper permissions
        if(!$this->createDirectory($uploadPath)) {
            $result['error'] = 105;
            $result['error_message'] = 'No se pudo crear el directorio de destino';
            return $result;
        }

        // Determine final filename
        if($forcedName !== NULL) {
            $finalFilename = $this->sanitizeFilename($forcedName) . '.' . $extension;
        } else {
            $sanitizedName = $this->sanitizeFilename($pathInfo['filename']);
            $finalFilename = $sanitizedName . '.' . $extension;
        }

        // Get unique filename if needed
        try {
            $uniqueFilename = $this->getUniqueFilename($uploadPath, $finalFilename, $allowOverwrite);
        } catch(RuntimeException $e) {
            $result['error'] = 106;
            $result['error_message'] = $e->getMessage();
            return $result;
        }

        // Final file path
        $finalPath = rtrim($uploadPath, '/\\') . DIRECTORY_SEPARATOR . $uniqueFilename;

        // Move uploaded file using secure PHP function
        // Note: move_uploaded_file() automatically calls is_uploaded_file() internally
        if(!move_uploaded_file($uploadedFile['tmp_name'], $finalPath)) {
            $result['error'] = 107;
            $result['error_message'] = 'Error al mover el archivo al destino final';
            return $result;
        }

        chmod($finalPath, $this->filePermission);

        // Create audit trail if requested (filename_yyyy_mm_dd_HH_ii.extension format)
        if($createAuditTrace) {
            $this->createAuditTrace($uploadPath, $uniqueFilename, $finalPath);
        }

        // Success!
        $result['ok'] = TRUE;
        $result['uploaded_filename'] = $uniqueFilename;
        $result['uploaded_path'] = $uploadPath;

        return $result;
    }

    /**
     * Create audit trace - copy of uploaded file with filename_yyyy_mm_dd_HH_ii.extension format
     */
    protected function createAuditTrace(string $uploadPath, string $filename, string $sourcePath): void {
        $pathInfo = pathinfo($filename);
        $baseName = $pathInfo['filename'];
        $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';

        $timestamp = date('Y_m_d_H_i');
        $auditFilename = $baseName . '_' . $timestamp . $extension;
        $auditPath = rtrim($uploadPath, '/\\') . DIRECTORY_SEPARATOR . $auditFilename;

        // Copy the file with proper audit filename format
        copy($sourcePath, $auditPath);

        // Set same permissions as original
        chmod($auditPath, $this->filePermission);
    }

    /**
     * Convenience method: Upload to web root relative path (most common case)
     */
    public function uploadPathFromWebRoot(
      string  $fileKey,
      array   $validExtensions,
      string  $uploadPath = 'uploads',
      array   $validMimeTypes = [],
      ?string $forcedName = NULL,
      bool    $createAuditTrace = FALSE,
      bool    $allowOverwrite = FALSE,
      int     $maxFileSize = 10485760,
      bool    $isRequired = TRUE
    ): array {
        return $this->upload(
          fileKey: $fileKey,
          validExtensions: $validExtensions,
          validMimeTypes: $validMimeTypes,
          uploadPath: $uploadPath,
          pathType: self::PATH_FROM_WEB_ROOT,
          forcedName: $forcedName,
          createAuditTrace: $createAuditTrace,
          allowOverwrite: $allowOverwrite,
          maxFileSize: $maxFileSize,
          isRequired: $isRequired
        );
    }

    /**
     * Convenience method: Upload to script-relative path
     */
    public function uploadPathFromScript(
      string  $fileKey,
      array   $validExtensions,
      string  $uploadPath = 'uploads',
      array   $validMimeTypes = [],
      ?string $forcedName = NULL,
      bool    $createAuditTrace = FALSE,
      bool    $allowOverwrite = FALSE,
      int     $maxFileSize = 10485760,
      bool    $isRequired = TRUE
    ): array {
        return $this->upload(
          fileKey: $fileKey,
          validExtensions: $validExtensions,
          validMimeTypes: $validMimeTypes,
          uploadPath: $uploadPath,
          pathType: self::PATH_FROM_SCRIPT,
          forcedName: $forcedName,
          createAuditTrace: $createAuditTrace,
          allowOverwrite: $allowOverwrite,
          maxFileSize: $maxFileSize,
          isRequired: $isRequired
        );
    }


    public function formatFileSize(int $bytes): string {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $factor = floor((strlen((string)$bytes) - 1) / 3);

        return sprintf("%.2f %s", $bytes / (1024 ** $factor), $units[$factor]);
    }

    /**
     * Validate if uploaded file is actually an image (public method)
     */
    protected function isValidImage(string $filePath): bool {
        return $this->validateImageFile($filePath);
    }

    /**
     * Get MIME type for extension
     */
    public function getMimeTypeForExtension(string $extension): ?string {
        return $this->mimeTypes[strtolower($extension)] ?? NULL;
    }

    /**
     * Get MIME types for multiple extensions
     */
    public function getMimeTypesForExtensions(array $extensions): array {
        $mimeTypes = [];
        foreach($extensions as $ext) {
            $mime = $this->getMimeTypeForExtension($ext);
            if($mime) {
                $mimeTypes[] = $mime;
            }
        }
        return array_unique($mimeTypes);
    }

    /**
     * Check if file has dangerous double extension
     * e.g., file.php.jpg could be executed as PHP on some Apache configurations
     */
    public function hasDangerousDoubleExtension(string $filename): bool {
        $dangerousExtensions = ['php', 'php3', 'php4', 'php5', 'phtml', 'asp', 'aspx', 'jsp', 'js', 'exe', 'bat', 'sh', 'cmd', 'pl', 'py', 'rb', 'cgi', 'dll', 'com', 'vbs', 'wsf', 'so', 'dll', 'com'];
        $parts = explode('.', $filename);

        if(count($parts) > 2) {
            for($i = 1; $i < count($parts) - 1; $i++) {
                if(in_array(strtolower($parts[$i]), $dangerousExtensions)) {
                    return TRUE;
                }
            }
        }

        return FALSE;
    }

    /**
     * Validate file using exec() and 'file' command (Unix systems only)
     * As suggested in PHP documentation comments
     */
    public function validateWithFileCommand(string $filePath): ?string {
        if(PHP_OS_FAMILY !== 'Linux' && PHP_OS_FAMILY !== 'Darwin') {
            return NULL; // Not available on Windows
        }

        $escapedPath = escapeshellarg($filePath);
        $output = [];
        $returnVar = 0;

        exec("file -b --mime-type $escapedPath 2>/dev/null", $output, $returnVar);

        if($returnVar === 0 && !empty($output[0])) {
            return trim($output[0]);
        }

        return NULL;
    }
}

