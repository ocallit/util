<?php
/** @noinspection PhpMissingParamTypeInspection */
/** @noinspection PhpRedundantOptionalArgumentInspection */

namespace Ocallit\Util;

use Ocallit\Sqler\SqlExecutor;

class Pwder {
    protected string $table;
    protected string $primaryKey;
    protected string $passwordColumn = "password";
    protected $sqlExec;

    public function __construct(SqlExecutor $sqlExec, string $table = "user", string $primaryKey = "user_id", string $passwordColumn = "password") {
        $this->sqlExec = $sqlExec;
        $this->table = $table;
        $this->primaryKey = $primaryKey;
        $this->passwordColumn = $passwordColumn;
    }

    public function update(string $user_id, #[\SensitiveParameter] string $password): bool {
        $sqlComment = "/*" . __METHOD__ . "*/";
        $hash = $this->hash($password);
        try {
            $this->sqlExec->query(
              "UPDATE $sqlComment {$this->table} SET {$this->passwordColumn} = ? WHERE {$this->primaryKey} = ?", [$hash, $user_id]);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function verify(string $user_id, #[\SensitiveParameter] string $password): bool {
        $sqlComment = "/*" . __METHOD__ . "*/";
        $hash = $this->sqlExec->firstValue(
          "SELECT $sqlComment {$this->passwordColumn} FROM {$this->table} WHERE {$this->primaryKey} = ?", [$user_id]);
        if(password_verify($password, $hash)) {
            if(password_needs_rehash($hash, PASSWORD_DEFAULT)) {
                $newHash = $this->hash($password);
                try {
                    $this->sqlExec->query(
                      "UPDATE $sqlComment {$this->table} SET {$this->passwordColumn}  = ? WHERE {$this->primaryKey} = ?",
                      [$newHash, $user_id]);
                } catch (\Throwable $e) {}
            }
            return true;
        }
        return false;
    }

    protected function hash(#[\SensitiveParameter] string $password): string {
        return password_hash($password, PASSWORD_DEFAULT);
    }
}
