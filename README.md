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
## NaturalSorter

A case and accent insensitivity, natural compare, multi key array sort and collator
- natural sort sorts numbers and number substrings gracefully

```php
 	$sorter = new NaturalSorter();
 	$sorter->sort($data, ["age" => "desc", "name"=>"asc"]);
 	$sorter->compare('si", "Sí'); // instead of natcasesort, strcasecmp or <=>:
```

## HtmlEr


## Pwder

## Session


## FirebaseRealtimeDb


## Uploader (v1)

## Uploader (v2)

