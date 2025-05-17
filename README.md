# util
Utilities
## WIP

### Memorize
Store result of slow computation, considering parameter values, for a pure function

```php
	#[Pure]
    function memorize_commonPattern($a, $b = 2, $c = null): array {
        $MemorizeKey = Memorize::generateKey(__METHOD__, func_get_args());
        if(Memorize::hasKey($MemorizeKey)) 
			return Memorize::getValue($MemorizeKey);

		// ... slow process to memotize

        $exampleReturnValue = [1,2,3,4];
        Memorize::setValue($MemorizeKey, $exampleReturnValue);
        return $exampleReturnValue;
    }
```
