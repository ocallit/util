<?php
/** @noinspection PhpUnused */

namespace Ocallit\Util;

use ReflectionException;
use ReflectionFunction;
use ReflectionMethod;
use function array_key_exists;
use function hash;
use function serialize;


/**
 * Memoization, storing function results to optimize repeat calls with the same arguments, up to
 *  Memorize::maxKeysToSave (default 10000).
 *
 * @usage
 *      $key = Memorize::generateKey(__METHOD__, func_get_args());
 *      if(Memorize::hasKey($key)) return Memorize::getValue($key);
 *      $value = ... calculate value ...
 *      Memorize::setValue($key, $value);
 *      return $value;
 */
final class Memorize {
    /**
     * @var array{string:mixed}
     */
    private static array $memory = [];
    private static int $maxKeysToSave = 10000;

    /**
     * Unique hash key based on the function or class::method name and its serialized arguments
     * @param string $func use __FUNCTION__ or __METHOD__
     * @param array{string:mixed}|array{} $func_get_args keyValue array keyed by parameter name usually func_get_args().
     * @return string A hash key for the function or class::method name and its serialized arguments
     * @example $key = Memorize::getKey(__METHOD__, func_get_args());
     *          if(Memorize::hasKey($key)) return Memorize::getValue($key);
     *          $value = ... calculate value ...
     *          Memorize::setValue($key, $value);
     *          return $value;
     *
     */
    public static function generateKey(string $func, array $func_get_args = []): string {
        return hash(
          "xxh128",
          "$func\t" . serialize(Memorize::getCompleteArguments($func, $func_get_args))
        );
    }

    public static function hasKey(string $key): bool {return array_key_exists($key, Memorize::$memory);}

    public static function getValue(string $key): mixed {return Memorize::$memory[$key] ?? NULL;}

    public static function setValue(string $key, mixed $value): void {
        if(count(Memorize::$memory) < Memorize::$maxKeysToSave)
            Memorize::$memory[$key] = $value;
    }

    public static function removeKey(string $key): void {unset(Memorize::$memory[$key]);}

    /**
     * Completes the provided arguments with default values from the specified function or method.
     *
     * @param string $func use __FUNCTION__ or __METHOD__
     * @param array{string:mixed}|array{} $func_get_args keyValue array keyed by parameter name usually func_get_args()
     *
     * @return array{string:mixed}|array{}  Returns an array, keyed by parameter name, of arguments completed with default values from the function or method.
     */
    public static function getCompleteArguments(string $func, array $func_get_args = []): array {
        $namedArgs = [];
        foreach(Memorize::getParamMeta($func) as $i => [$name, $default])
            $namedArgs[$name] = array_key_exists($i, $func_get_args) ? $func_get_args[$i] : $default;
        return $namedArgs;
    }

    public static function getMaxKeysToSave(): int {return Memorize::$maxKeysToSave;}

    public static function setMaxKeysToSave(int $maxKeysToSave): void {Memorize::$maxKeysToSave = $maxKeysToSave;}

    /**
     * Returns a cached list of [parameter name, default value] pairs for a given function or method.
     */
    private static function getParamMeta(string $func): array {
        static $paramMetaCache = [];

        if(isset($paramMetaCache[$func])) {
            return $paramMetaCache[$func];
        }

        try {
            $ref = str_contains($func, '::')
              ? new ReflectionMethod(...explode('::', $func, 2))
              : new ReflectionFunction($func);

            $paramMetaCache[$func] = array_map(
              fn($p) => [$p->getName(), $p->isDefaultValueAvailable() ? $p->getDefaultValue() : NULL],
              $ref->getParameters()
            );

            return $paramMetaCache[$func];

        } catch(ReflectionException) {
            return [];
        }
    }

}
