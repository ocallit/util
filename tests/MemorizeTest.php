<?php
declare(strict_types=1);

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;
use ollicat\util\Memorize;

class DummyParamClass {
    public static function staticMethod(int $x, string $y = 'foo'): void {}
}

// Helper functions for testing getCompleteArguments
if(!function_exists('memorize_test_func')) {
    function memorize_test_func(int $a, string $b = 'hello', ?float $c = NULL) {}
}
if(!function_exists('memorize_test_variadicFunc')) {
    function memorize_test_variadicFunc($a, ...$rest) {}
}
if(!function_exists('memorize_test_unionFunc')) {
    function memorize_test_unionFunc(int|float $x = 0, null|bool $y = FALSE) {}
}

if(!function_exists('memorize_test_commonPattern')) {
    function memorize_test_commonPattern($a, $b = 2, $c = null): array {
        $MemorizeKey = Memorize::generateKey(__METHOD__, func_get_args());
        if(Memorize::hasKey($MemorizeKey)) return Memorize::getValue($MemorizeKey);

        $value = ["a" => $a, "b" => $b, "c" => $c];
        Memorize::setValue($MemorizeKey, $value);
        return $value;
    }
}

#[CoversClass(Memorize::class)]
final class MemorizeTest extends TestCase {
    protected function setUp(): void {
        // Reset the internal memory
        $ref = new \ReflectionClass(Memorize::class);
        $memProp = $ref->getProperty('memory');
        $memProp->setAccessible(TRUE);
        $memProp->setValue(NULL, []);

        // Reset maxKeysToSave to default
        Memorize::setMaxKeysToSave(10000);
    }

    public function testGenerateKeyDirectCallUserFuncAndReflection(): void {
        $func = 'myFunc';
        $args = [1, 2, 3];

        // Direct call
        $key1 = Memorize::generateKey($func, $args);

        // call_user_func
        $key2 = \call_user_func([Memorize::class, 'generateKey'], $func, $args);

        // ReflectionMethod::invokeArgs
        $rm = new \ReflectionMethod(Memorize::class, 'generateKey');
        $key3 = $rm->invokeArgs(NULL, [$func, $args]);

        $this->assertSame($key1, $key2);
        $this->assertSame($key1, $key3);
    }

    public function testGenerateKeyDefaultAndNamedParameters(): void {
        $func = 'anotherFunc';

        // Zero args (uses default [])
        $keyDefault1 = Memorize::generateKey($func);
        $keyDefault2 = Memorize::generateKey($func, []);
        $keyNamed = Memorize::generateKey(func: $func);

        $this->assertSame($keyDefault1, $keyDefault2);
        $this->assertSame($keyDefault1, $keyNamed);

        // Named parameters out of order
        $args = ['x', 'y'];
        $keyPositional = Memorize::generateKey('foo', $args);
        $keyNamedOut = Memorize::generateKey(func_get_args: $args, func: 'foo');

        $this->assertSame($keyPositional, $keyNamedOut);
    }

    public function testSetHasGetRemoveValueBehavior(): void {
        $func = 'cacheFunc';
        $args = ['alpha'];
        $key = Memorize::generateKey($func, $args);

        $this->assertFalse(Memorize::hasKey($key));

        Memorize::setValue($key, 123);
        $this->assertTrue(Memorize::hasKey($key));
        $this->assertSame(123, Memorize::getValue($key));

        Memorize::removeKey($key);
        $this->assertFalse(Memorize::hasKey($key));
    }

    public function testMaxKeysToSaveLimitEnforced(): void {
        // Lower the limit to 2 entries
        Memorize::setMaxKeysToSave(2);

        $k1 = Memorize::generateKey('A');
        $k2 = Memorize::generateKey('B');
        $k3 = Memorize::generateKey('C');

        Memorize::setValue($k1, 'one');
        Memorize::setValue($k2, 'two');
        Memorize::setValue($k3, 'three');

        $this->assertTrue(Memorize::hasKey($k1));
        $this->assertTrue(Memorize::hasKey($k2));
        // Third insertion should be ignored
        $this->assertFalse(Memorize::hasKey($k3));

        // Restore default limit
        Memorize::setMaxKeysToSave(10000);
    }

    public function testGetCompleteArgumentsWithDefaultsAndVariations(): void {
        // Only one argument provided; b and c should use defaults
        $complete1 = Memorize::getCompleteArguments('memorize_test_func', [10]);
        $this->assertSame(['a' => 10, 'b' => 'hello', 'c' => NULL], $complete1);

        // All arguments provided
        $complete2 = Memorize::getCompleteArguments('memorize_test_func', [20, 'world', 3.14]);
        $this->assertSame(['a' => 20, 'b' => 'world', 'c' => 3.14], $complete2);
    }

    public function testGetCompleteArgumentsVariadicParameters(): void {
        // Only the required parameter; rest defaults to null
        $v1 = Memorize::getCompleteArguments('memorize_test_variadicFunc', [1]);
        $this->assertSame(['a' => 1, 'rest' => NULL], $v1);

        // Pass an explicit array for variadic
        $v2 = Memorize::getCompleteArguments('memorize_test_variadicFunc', [2, [3, 4]]);
        $this->assertSame(['a' => 2, 'rest' => [3, 4]], $v2);
    }

    public function testGetCompleteArgumentsUnionAndNullableTypes(): void {
        // No args: use both defaults
        $u1 = Memorize::getCompleteArguments('memorize_test_unionFunc', []);
        $this->assertSame(['x' => 0, 'y' => FALSE], $u1);

        // Override both
        $u2 = Memorize::getCompleteArguments('memorize_test_unionFunc', [2.5, TRUE]);
        $this->assertSame(['x' => 2.5, 'y' => TRUE], $u2);
    }

    public function testGetParamMetaMethodBranch(): void
    {
        // Build the “Class::method” string
        $func = DummyParamClass::class . '::staticMethod';

        // Use reflection to call the private getParamMeta
        $rm = new \ReflectionMethod(\ollicat\util\Memorize::class, 'getParamMeta');
        $rm->setAccessible(true);

        /** @var array<array{string, mixed}> $meta */
        $meta = $rm->invoke(null, $func);

        // Expect two parameters:
        //  - 'x' has no default → null
        //  - 'y' has default 'foo'
        $this->assertCount(2, $meta);

        [$name0, $default0] = $meta[0];
        $this->assertSame('x',    $name0);
        $this->assertNull($default0);

        [$name1, $default1] = $meta[1];
        $this->assertSame('y',    $name1);
        $this->assertSame('foo',  $default1);
    }

    public function testCommonPattern() {
        $firstCall = memorize_test_commonPattern(3);
        $this->assertSame(['a' => 3, 'b' => 2, 'c' => null], $firstCall, "First call value returned Ok");

        $secondCall = memorize_test_commonPattern(3);
        $this->assertSame($firstCall, $secondCall, "Second call with same parameters value returned Ok");

        $specifyDefaults = memorize_test_commonPattern(3, 2, null);
        $this->assertSame($firstCall, $specifyDefaults, "with defaults specified");

        $namedDefaults = memorize_test_commonPattern(c: null, b:2, a:3, );
        $this->assertSame($firstCall, $namedDefaults, "named parameters with defaults spefcfied");

        $namedSome = memorize_test_commonPattern( b:2, a:3, );
        $this->assertSame($firstCall, $namedSome, "named parameters with defaults used for a parameter");
    }
}
