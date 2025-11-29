<?php
use Ocallit\Sqler\SqlExecutor;
require_once("../../../vendor/autoload.php");


global $SqlExecutor;
$SqlExecutor = new SqlExecutor(["username" => "root", "password" => "986532", "database" => "roler"]);
