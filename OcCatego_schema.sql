create table ocCatalog(
	ocCatalog_id MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
	catalogName VARCHAR(64) NOT NULL UNIQUE,
	description VARCHAR(255) NOT NULL DEFAULT '',
	icon VARCHAR(64) NOT NULL DEFAULT '',
);
create table ocCatalogTags(
	ocCatalogTags_id MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
	ocCatalog_id MEDIUMINT UNSIGNED NOT NULL,
	CONSTRAINT fk_catalog FOREIGN KEY (ocCatalog_id) REFERENCES ocCatalog(ocCatalog_id) ON DELETE CASCADE,
	tag VARCHAR(64) NOT NULL,
	UNIQUE KEY tag_unico(ocCatalog_id, tag)
);



-- option #1 all tags, or all catalogs, in a single table ocCatlogTagged the catalog is differentitated, edit & show distinguish by ocCatalog_id up the heirarchy
create table ocCatlogTagged (
	ocCatlogTagged_id MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
	ocCatalogTags_id MEDIUMINT UNSIGNED NOT NULL,
		CONSTRAINT fk_tag FOREIGN KEY (ocCatalogTags_id) REFERENCES ocCatalogTags(ocCatalogTags_id) ON DELETE CASCADE.
	pk VARCHAR(32) NOT NULL,
	tableName varchar(128) NOT NULL,
	UNIQUE KEY unico(pk, tableName, ocCatlogTags_id)
);

-- ≤5 target tables, separate tables ocCatlogTagged_tableName
create table ocCatlogTagged_tableName (
	ocCatlogTagged_tableName_id MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
	ocCatalogTags_id MEDIUMINT UNSIGNED NOT NULL,
	CONSTRAINT fk_tag FOREIGN KEY (ocCatalogTags_id) REFERENCES ocCatalogTags(ocCatalogTags_id) ON DELETE CASCADE.
	pk VARCHAR(32) NOT NULL, -- or whatever he table is using as primary key type
	-- todo foreign key to tableName
	UNIQUE KEY unico(pk, ocCatlogTags_id)
);
 