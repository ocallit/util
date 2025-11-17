


CREATE TABLE actividad (
    actividad_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    actividad VARCHAR(64) UNIQUE NOT NULL,
    descripcion LONGTEXT,
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

CREATE TABLE actividad_permiso (
    actividad_permiso_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    actividad_id MEDIUMINT UNSIGNED NOT NULL,
    FOREIGN KEY (actividad_id) REFERENCES actividad(actividad_id) ON DELETE CASCADE,
    permiso VARCHAR(16) NOT NULL,
    UNIQUE KEY permiso_por_actividad(actividad_id, permiso),
    etiqueta VARCHAR(16) NOT NULL,
    UNIQUE KEY etiqueta_por_actividad(etiqueta, actividad_id),
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

CREATE TABLE rol (
    rol_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    rol VARCHAR(64) UNIQUE NOT NULL,
    descripcion LONGTEXT,
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

CREATE TABLE rol_actividad_permiso (
    rol_id MEDIUMINT UNSIGNED,
    FOREIGN KEY (rol_id) REFERENCES rol(rol_id) ON DELETE CASCADE,
    actividad_permiso_id MEDIUMINT UNSIGNED,
    FOREIGN KEY (actividad_permiso_id) REFERENCES actividad_permiso(actividad_permiso_id) ON DELETE CASCADE,
    PRIMARY KEY (actividad_permiso_id, rol_id),
    KEY por_rol(rol_id),
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

CREATE TABLE usuario (
    usuario_id MEDIUMINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    nick VARCHAR(16) NOT NULL UNIQUE,
    estatus ENUM('Puede Login', 'No Puede Login') NOT NULL DEFAULT 'Puede Login',
    CONSTRAINT chk_estatus CHECK (estatus IN ('Puede Login', 'No Puede Login')),
    nota VARCHAR(255) NULL DEFAULT '',

    nombre  VARCHAR(128) NOT NULL DEFAULT '?',

    email VARCHAR(320) NOT NULL DEFAULT '',
    cel VARCHAR(16) NOT NULL DEFAULT '',

    password VARCHAR(255) NULL,
    password_forza_cambio ENUM('Si', 'No') NOT NULL DEFAULT 'No',
    CONSTRAINT chk_forzar_cambio CHECK (password_forza_cambio IN ('Si', 'No')),
    password_caducidad_dias SMALLINT UNSIGNED DEFAULT 90,
    password_ultimo_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,

    ultimo_login DATETIME NULL,
    creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por VARCHAR(16) NOT NULL DEFAULT '?',
    ultimo_cambio_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_cambio_por VARCHAR(16) NOT NULL DEFAULT '?'
);

CREATE TABLE rol_usuario (
    rol_id MEDIUMINT UNSIGNED,
    FOREIGN KEY (rol_id) REFERENCES rol(rol_id) ON DELETE CASCADE,
    usuario_id MEDIUMINT UNSIGNED,
    FOREIGN KEY (usuario_id) REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, rol_id),
    KEY por_rol(rol_id),
    registrado_el DATETIME NOT NULL DEFAULT NOW(),
    registrado_por VARCHAR(16) NOT NULL DEFAULT 'system'
) ENGINE=InnoDB;

