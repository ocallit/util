<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use Ocallit\Util\HtmlEr;

require_once(__DIR__ . "/../src/HtmlEr.php");

#[CoversClass(HtmlEr::class)]
class HtmlErTest extends TestCase {
    private HtmlEr $htmlEr;

    protected function setUp(): void {
        $this->htmlEr = new HtmlEr();
    }

    #[DataProvider('optionsDataProvider')]
    public function testOptions(array $options, array|string $selectedValues, array $meta, string $expected, string $testCase): void {
        $result = $this->htmlEr->options($options, $selectedValues, $meta);
        $this->assertEquals($expected, $result, "Failed test case: {$testCase}");
    }

    public static function optionsDataProvider(): array {
        return [
          'empty array' => [
            [],
            '',
            ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']],
            '',
            'Empty options array should return empty string',
          ],
          'simple key-value array' => [
            ['1' => 'Option 1', '2' => 'Option 2'],
            '1',
            ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']],
            '<option value="1" selected=\'selected\' >Option 1</option><option value="2" >Option 2</option>',
            'Basic key-value array with single selection',
          ],
          'indexed array' => [
            ['Apple', 'Banana', 'Cherry'],
            'Banana',
            ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']],
            '<option value="Apple" >Apple</option><option value="Banana" selected=\'selected\' >Banana</option><option value="Cherry" >Cherry</option>',
            'Indexed array with string selection',
          ],
          'complex array with meta' => [
            [
              ['id' => '1', 'text' => 'First Option', 'class' => 'option-class'],
              ['id' => '2', 'text' => 'Second Option', 'disabled' => 'disabled'],
            ],
            '2',
            ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']],
            '<option value="1"  class="option-class">First Option</option><option value="2" selected=\'selected\'  disabled="disabled">Second Option</option>',
            'Complex array with attributes and meta mapping',
          ],
          'multiple selections' => [
            ['a' => 'Alpha', 'b' => 'Beta', 'c' => 'Gamma'],
            ['a', 'c'],
            ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']],
            '<option value="a" selected=\'selected\' >Alpha</option><option value="b" >Beta</option><option value="c" selected=\'selected\' >Gamma</option>',
            'Multiple selections with array of selected values',
          ],
          'data attributes' => [
            [
              ['id' => '1', 'text' => 'Option 1', 'data-test' => 'value1', 'data-id' => '123'],
            ],
            '1',
            ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']],
            '<option value="1" selected=\'selected\'  data-test="value1" data-id="123">Option 1</option>',
            'Data attributes should be included automatically',
          ],
          'html entities in text' => [
            ['1' => '<script>alert("xss")</script>', '2' => 'Safe & Sound'],
            '1',
            ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']],
            '<option value="1" selected=\'selected\' >&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</option><option value="2" >Safe &amp; Sound</option>',
            'HTML entities should be properly escaped',
          ],
          'complex array fallback values' => [
            [
              ['name' => 'John', 'age' => 30],
              ['name' => 'Jane', 'age' => 25],
            ],
            'John',
            ['value' => 'id', 'text' => 'text', 'attr' => ['class', 'style', 'title', 'disabled', 'id']],
            '<option value="John" selected=\'selected\' >30</option><option value="Jane" >25</option>',
            'Should use first value as value and second as text when meta keys not found',
          ],
        ];
    }

    #[DataProvider('selectedDataProvider')]
    public function testSelected($value, $selectedValues, string $expected, string $testCase): void {
        $result = $this->htmlEr->selected($value, $selectedValues);
        $this->assertEquals($expected, $result, "Failed test case: {$testCase}");
    }

    public static function selectedDataProvider(): array {
        return [
          'string match' => [
            'test',
            'test',
            'value="test" selected=\'selected\' ',
            'String value should match selected value',
          ],
          'string no match' => [
            'test',
            'other',
            'value="test" ',
            'String value should not match different selected value',
          ],
          'array contains value' => [
            'test',
            ['test', 'other'],
            'value="test" selected=\'selected\' ',
            'Array of selected values should contain the value',
          ],
          'array does not contain value' => [
            'test',
            ['other', 'another'],
            'value="test" ',
            'Array of selected values should not contain the value',
          ],
          'numeric string conversion' => [
            '1',
            1,
            'value="1" selected=\'selected\' ',
            'Numeric string should match numeric value after conversion',
          ],
          'boolean true' => [
            TRUE,
            'true',
            'value="1" selected=\'selected\' ',
            'Boolean true should convert to "1" and match',
          ],
          'null value' => [
            NULL,
            '',
            'value="" selected=\'selected\' ',
            'Null value should convert to empty string',
          ],
          'special characters in value' => [
            'test"value\'here',
            'test"value\'here',
            'value="test&#34value&#39;here" selected=\'selected\' ',
            'Special characters should be properly escaped',
          ],
        ];
    }

    #[DataProvider('checkedDataProvider')]
    public function testChecked($value, $checkedValues, string $expected, string $testCase): void {
        $result = $this->htmlEr->checked($value, $checkedValues);
        $this->assertEquals($expected, $result, "Failed test case: {$testCase}");
    }

    public static function checkedDataProvider(): array {
        return [
          'string match' => [
            'test',
            'test',
            'value="test" checked=\'checked\' ',
            'String value should match checked value',
          ],
          'string no match' => [
            'test',
            'other',
            'value="test" ',
            'String value should not match different checked value',
          ],
          'array contains value' => [
            'test',
            ['test', 'other'],
            'value="test" checked=\'checked\' ',
            'Array of checked values should contain the value',
          ],
          'array does not contain value' => [
            'test',
            ['other', 'another'],
            'value="test" ',
            'Array of checked values should not contain the value',
          ],
          'numeric conversion' => [
            1,
            '1',
            'value="1" checked=\'checked\' ',
            'Numeric value should match string after conversion',
          ],
          'boolean false' => [
            FALSE,
            '',
            'value="" checked=\'checked\' ',
            'Boolean false should convert to empty string',
          ],
        ];
    }

    #[DataProvider('array2attributesDataProvider')]
    public function testArray2attributes(array $attributes, string $expected, string $testCase): void {
        $result = $this->htmlEr->array2attributes($attributes);
        $this->assertEquals($expected, $result, "Failed test case: {$testCase}");
    }

    public static function array2attributesDataProvider(): array {
        return [
          'empty array' => [
            [],
            '',
            'Empty array should return empty string',
          ],
          'single attribute' => [
            ['class' => 'test-class'],
            'class="test-class"',
            'Single attribute should be formatted correctly',
          ],
          'multiple attributes' => [
            ['class' => 'test-class', 'id' => 'test-id', 'style' => 'color: red;'],
            'class="test-class" id="test-id" style="color: red;"',
            'Multiple attributes should be joined with spaces',
          ],
          'attributes with quotes' => [
            ['title' => 'This is a "test" value', 'alt' => "It's working"],
            'title="This is a &#34test&#34 value" alt="It&#39;s working"',
            'Quotes should be properly escaped',
          ],
          'numeric values' => [
            ['tabindex' => 1, 'data-count' => 42],
            'tabindex="1" data-count="42"',
            'Numeric values should be converted to strings',
          ],
        ];
    }

    #[DataProvider('array2dataDataProvider')]
    public function testArray2data(array $data, string $expected, string $testCase): void {
        $result = $this->htmlEr->array2data($data);
        $this->assertEquals($expected, $result, "Failed test case: {$testCase}");
    }

    public static function array2dataDataProvider(): array {
        return [
          'empty array' => [
            [],
            '',
            'Empty array should return empty string',
          ],
          'single data attribute' => [
            ['test' => 'value'],
            'data-test="value"',
            'Single data attribute should be prefixed with data-',
          ],
          'multiple data attributes' => [
            ['id' => '123', 'name' => 'test', 'active' => 'true'],
            'data-id="123" data-name="test" data-active="true"',
            'Multiple data attributes should be joined with spaces',
          ],
          'complex data values' => [
            ['json' => '{"key": "value"}', 'url' => 'https://example.com'],
            'data-json="{&quot;key&quot;: &quot;value&quot;}" data-url="https://example.com"',
            'Complex data values should be properly escaped',
          ],
        ];
    }

    #[DataProvider('attributeDataProvider')]
    public function testAttribute($name, $value, string $expected, string $testCase): void {
        $result = $this->htmlEr->attribute($name, $value);
        $this->assertEquals($expected, $result, "Failed test case: {$testCase}");
    }

    public static function attributeDataProvider(): array {
        return [
          'simple attribute' => [
            'class',
            'test-class',
            'class="test-class"',
            'Simple attribute should use double quotes',
          ],
          'attribute with double quotes' => [
            'title',
            'This is a "test" value',
            'title=\'This is a "test" value\'',
            'Attribute with double quotes should use single quotes',
          ],
          'attribute with single quotes' => [
            'alt',
            "It's working",
            'alt="It\'s working"',
            'Attribute with single quotes should use double quotes',
          ],
          'attribute with both quotes' => [
            'data-info',
            'This is a "test" and it\'s working',
            'data-info="This is a &#34test&#34 and it&#39;s working"',
            'Attribute with both quotes should escape and use double quotes',
          ],
          'numeric value' => [
            'tabindex',
            42,
            'tabindex="42"',
            'Numeric values should be converted to strings',
          ],
          'boolean value' => [
            'required',
            TRUE,
            'required="1"',
            'Boolean true should convert to "1"',
          ],
          'null value' => [
            'placeholder',
            NULL,
            'placeholder=""',
            'Null values should convert to empty string',
          ],
          'stringable object' => [
            'value',
            new class implements Stringable {
                public function __toString(): string {
                    return 'stringable';
                }
            },
            'value="stringable"',
            'Stringable objects should be converted to strings',
          ],
        ];
    }

    #[DataProvider('attributeValueDataProvider')]
    public function testAttributeValue($value, string $expected, string $testCase): void {
        $result = $this->htmlEr->attributeValue($value);
        $this->assertEquals($expected, $result, "Failed test case: {$testCase}");
    }

    public static function attributeValueDataProvider(): array {
        return [
          'simple string' => [
            'test',
            '"test"',
            'Simple string should be wrapped in quotes',
          ],
          'string with double quotes' => [
            'This is a "test" value',
            '"This is a &#34;test&#34; value"',
            'Double quotes should be escaped',
          ],
          'string with single quotes' => [
            "It's working",
            '"It&#39;s working"',
            'Single quotes should be escaped',
          ],
          'string with both quotes' => [
            'This is a "test" and it\'s working',
            '"This is a &#34;test&#34; and it&#39;s working"',
            'Both types of quotes should be escaped',
          ],
          'numeric value' => [
            123,
            '"123"',
            'Numeric values should be converted to strings',
          ],
          'boolean value' => [
            FALSE,
            '""',
            'Boolean false should convert to empty string',
          ],
          'null value' => [
            NULL,
            '""',
            'Null should convert to empty string',
          ],
        ];
    }

    public function testArrayFirst(): void {
        $reflection = new ReflectionClass($this->htmlEr);
        $method = $reflection->getMethod('array_first');
        $method->setAccessible(TRUE);

        // Test with non-empty array
        $result = $method->invoke($this->htmlEr, ['first', 'second', 'third']);
        $this->assertEquals('first', $result, 'Should return first element');

        // Test with associative array
        $result = $method->invoke($this->htmlEr, ['key1' => 'value1', 'key2' => 'value2']);
        $this->assertEquals('value1', $result, 'Should return first value from associative array');

        // Test with empty array
        $result = $method->invoke($this->htmlEr, []);
        $this->assertNull($result, 'Should return null for empty array');

        // Test with array containing null
        $result = $method->invoke($this->htmlEr, [NULL, 'second']);
        $this->assertNull($result, 'Should return null if first element is null');
    }

    #[DataProvider('edgeCaseDataProvider')]
    public function testEdgeCases($method, $args, $expected, string $testCase): void {
        $result = $this->htmlEr->$method(...$args);
        $this->assertEquals($expected, $result, "Failed edge case: {$testCase}");
    }

    public static function edgeCaseDataProvider(): array {
        return [
          'options with zero as key' => [
            'options',
            [[0 => 'Zero', 1 => 'One'], 0, ['value' => 'id', 'text' => 'text', 'attr' => []]],
            '<option value="0" selected=\'selected\' >Zero</option><option value="1" >One</option>',
            'Zero as key should be handled correctly',
          ],
          'selected with zero comparison' => [
            'selected',
            [0, '0'],
            'value="0" selected=\'selected\' ',
            'Zero should match string zero',
          ],
          'attribute with empty string' => [
            'attribute',
            ['class', ''],
            'class=""',
            'Empty string value should create empty attribute',
          ],
          'array2attributes with null values' => [
            'array2attributes',
            [['disabled' => NULL, 'required' => TRUE]],
            'disabled="" required="1"',
            'Null values should convert to empty strings',
          ],
        ];
    }

    #[DataProvider('xssPreventionDataProvider')]
    public function testXssPrevention($method, $args, string $testCase): void {
        $result = $this->htmlEr->$method(...$args);

        // Check that common XSS patterns are properly escaped
        $this->assertStringNotContainsString('<script>', $result, "Failed XSS prevention: {$testCase}");
        $this->assertStringNotContainsString('javascript:', $result, "Failed XSS prevention: {$testCase}");
        $this->assertStringNotContainsString('onload=', $result, "Failed XSS prevention: {$testCase}");
    }

    public static function xssPreventionDataProvider(): array {
        return [
          'options with script tag' => [
            'options',
            [['<script>alert("xss")</script>' => 'Evil'], '', []],
            'Script tags in option text should be escaped',
          ],
          'attribute with javascript protocol' => [
            'attribute',
            ['href', 'javascript:alert("xss")'],
            'JavaScript protocol should be escaped',
          ],
          'attribute with onload event' => [
            'attribute',
            ['onload', 'alert("xss")'],
            'Event handlers should be escaped',
          ],
        ];
    }
}