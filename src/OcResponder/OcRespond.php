<?php
/** @noinspection PhpUnused */

namespace ocallit\Util\OcResponder;

#[\AllowDynamicProperties]
class OcRespond {
    public bool $ok;
    public int $code;
    public string $error;

    /**
     * @param bool $ok
     * @param int $code
     * @param string $error
     */
    public function __construct(bool $ok = true, int $code = 200, string $error = "") {
        $this->ok = $ok;
        $this->code = $code;
        $this->error = $error;
    }


}
