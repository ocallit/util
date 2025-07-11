<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * @covers \FileUploader
 */
final class FileUploaderTest extends TestCase
{
    private UploaderMock $uploader;
    private array $originalIniSettings = [];

    protected function setUp(): void
    {
        require_once __DIR__ . '/../Uploader.php';
        $this->uploader = new UploaderMock();
        $this->originalIniSettings['upload_max_filesize'] = ini_get('upload_max_filesize');
        $this->originalIniSettings['post_max_size'] = ini_get('post_max_size');
    }

    protected function tearDown(): void
    {
        // Restore original ini settings
        ini_set('upload_max_filesize', (string) $this->originalIniSettings['upload_max_filesize']);
        ini_set('post_max_size', (string) $this->originalIniSettings['post_max_size']);
    }

    public function testGetFormEnctype(): void
    {
        $this->assertSame('multipart/form-data', $this->uploader->getFormEnctype());
    }

    public function testGetMaxFileSizeInput(): void
    {
        $html = $this->uploader->getMaxFileSizeInput(5000000);
        $this->assertStringContainsString('name="MAX_FILE_SIZE"', $html);
        $this->assertStringContainsString('5000000', $html);
    }

    public function testGetAcceptAttribute(): void
    {
        $ext = ['jpg', 'png'];
        $expected = '.jpg,.png';
        $this->assertSame($expected, $this->uploader->getAcceptAttribute($ext));
    }

    public function testResolveUploadPathConstants(): void
    {
        $base = 'uploads/test';
        $this->assertStringEndsWith($base, $this->uploader->callResolveUploadPath($base, FileUploader::PATH_FROM_SCRIPT));
        $this->assertStringEndsWith($base, $this->uploader->callResolveUploadPath($base, FileUploader::PATH_FROM_WEB_ROOT));
        $abs = '/tmp/abc';
        $this->assertSame($abs, $this->uploader->callResolveUploadPath($abs, FileUploader::PATH_ABSOLUTE));
    }

    public function testNormalizeFilesArraySingleAndMultiple(): void
    {
        $single = ['name' => 'a.jpg', 'type' => 'image/jpeg', 'tmp_name' => '/tmp/x', 'error' => 0, 'size' => 123];
        $multi = ['name' => ['a.jpg', 'b.jpg'], 'type' => ['image/jpeg', 'image/jpeg'], 'tmp_name' => ['/tmp/x', '/tmp/y'], 'error' => [0, 0], 'size' => [123, 456]];

        $resSingle = $this->uploader->callNormalizeFilesArray($single);
        $this->assertCount(1, $resSingle);

        $resMulti = $this->uploader->callNormalizeFilesArray($multi);
        $this->assertCount(2, $resMulti);
    }

    public function testConvertToBytes(): void
    {
        $this->assertSame(2048, $this->uploader->callConvertToBytes('2K'));
        $this->assertSame(3145728, $this->uploader->callConvertToBytes('3M'));
        $this->assertSame(1073741824, $this->uploader->callConvertToBytes('1G'));
    }

    public function testSanitizeFilename(): void
    {
        $badNames = ['..\secret\file.txt', '/etc/passwd', 'bad|name.jpg', 'a>b.txt'];
        foreach ($badNames as $name) {
            $clean = $this->uploader->callSanitizeFilename($name);
            $this->assertMatchesRegularExpression('/^[a-zA-Z0-9._-]+$/', $clean);
        }
    }

    public function testValidateExtension(): void
    {
        $this->assertTrue($this->uploader->callValidateExtension('jpg', FileUploader::EXT_IMAGES));
        $this->assertFalse($this->uploader->callValidateExtension('exe', FileUploader::EXT_IMAGES));
        $this->assertFalse($this->uploader->callValidateExtension('jpg.exe', FileUploader::EXT_IMAGES));
    }

    public function testValidateMimeType(): void
    {
        $this->assertTrue($this->uploader->callValidateMimeType(__FILE__, ['text/x-php', 'application/octet-stream']));
        $this->assertFalse($this->uploader->callValidateMimeType(__FILE__, ['image/png']));
    }

    public function testGetUploadErrorMessage(): void
    {
        $this->assertStringContainsString('upload_max_filesize', $this->uploader->callGetUploadErrorMessage(1));
        $this->assertStringContainsString('Unknown upload error', $this->uploader->callGetUploadErrorMessage(99));
    }
}
