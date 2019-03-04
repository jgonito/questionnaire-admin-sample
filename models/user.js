function User(props, raw) {
    "using strict";

    var _props = {
            "ID": 0,
            "LastName": "",
            "FirstName": "",
            "MiddleName": "",
            "Email": "",
            "Username": "",
            "Password": "",
            "IsAdmin": 0,
            "IsActive": 0,
            "CreatedBy": 0,
            "CreatedAt": 0
        },
        _this = {
            "Get": _get,
            "Set": _set,
            "Raw": _raw,
            "All": _all,
            "Load": _load,
            "Filter": _filter,
            "Save": _save,
            "Delete": _delete,
            "Fields": _fields,
            "Login": _login,
            "ChangePassword": _changePassword
        };

    if (props && props instanceof Object) {
        if (raw) {
            for (let prop in _props) {
                if (prop === "Password") {
                    continue;
                }

                let col = _toSnakeCase(prop);
                if (col in props) {
                    _props[prop] = props[col];
                }
            }
        } else {
            for (let prop in props) {
                _set(prop, props[prop]);
            }
        }
    }

    function _get(prop) {
        switch (prop) {
            case "IsAdmin":
            case "IsAactive":
                // ** cast into boolean **
                return !!_props[prop];
            default:
                if (prop in _props) {
                    return _props[prop];
                }
        }
        return null;
    }

    function _set(prop, value) {
        switch (prop) {
            case "ID":
            case "IsAdmin":
            case "IsActive":
                // ** cast into integer **
                _props[prop] = +value;
                break;
            case "CreatedAt":
                // ** don't allow to overwrite **
                break;
            default:
                if (prop in _props) {
                    _props[prop] = value;
                }
        }
    }

    function _raw() {
        let obj = {};
        for (let prop in _props) {
            obj[_toSnakeCase(prop)] = _props[prop];
        }
        return obj;
    }

    function _all(db, raw, cb) {
        _filter(db, null, raw, cb);
    }

    function _load(db, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }

        _filter(db, {"id":_props.ID}, true, function(err, rawUsers){
            if (rawUsers.length > 0) {
                let rawUser = rawUsers[0];
                for (let prop in _props) {
                    let col = _toSnakeCase(prop);
                    _props[prop] = rawUser[col];
                }
            }

            cb.call(_this, err);
        });
    }

    function _filter(db, params, raw, cb) {
        let sql = "SELECT a.* FROM q_user AS a",
            values = [];

        if (params) {
            let sqlPlaceHolders = [];

            if ("id" in params) {
                sqlPlaceHolders.push("a.`id`=?");
                values.push(params.id);
            } else {
                if ("username" in params && params.username !== "") {
                    sqlPlaceHolders.push("a.`username`=?");
                    values.push(params.username);
                }

                if ("password" in params && params.password !== "") {
                    sqlPlaceHolders.push("a.`password`=MD5(?)");
                    values.push(params.password);
                }

                if ("admin" in params && !isNaN(params.admin)) {
                    sqlPlaceHolders.push("a.`is_admin`=?");
                    values.push(params.admin);
                }

                if ("active" in params && !isNaN(params.active)) {
                    sqlPlaceHolders.push("a.`is_active`=?");
                    values.push(params.active);
                }

                if ("keyword" in params && params.keyword !== "") {
                    let keyword = "%" + params.keyword + "%";
                    sqlPlaceHolders.push("(" +
                        "a.`last_name` LIKE ? OR " +
                        "a.`first_name` LIKE ? OR " +
                        "a.`middle_name` LIKE ? OR " +
                        "a.`username` LIKE ?" +
                    ")");
                    values = values.concat([keyword, keyword, keyword, keyword]);
                }
            }

            if (sqlPlaceHolders.length > 0) {
                sql += " WHERE " + sqlPlaceHolders.join(" AND ");
            }
        }
        
        sql += " ORDER BY a.`id`";

        db.Select(sql, values, function(err, result){
            let users = [];
            if (result && result.length > 0) {
                if (raw) {
                    users = result;
                } else {
                    for (let row of result) {
                        users.push(new User(row, true));
                    }
                }
            }
            
            cb.call(_this, err, users);
        });
    }

    function _save(db, cb) {
        let sql = "",
            values = [];

        if (_props.ID > 0) {
            sql = "UPDATE q_user SET " +
                    "`last_name`=?," +
                    "`first_name`=?," +
                    "`middle_name`=?," +
                    "`email`=?," +
                    "`username`=?," +
                    "`is_admin`=?," +
                    "`is_active`=? " +
                  "WHERE `id`=?";
            values = [
                _props.LastName,
                _props.FirstName,
                _props.MiddleName,
                _props.Email,
                _props.Username,
                _props.IsAdmin,
                _props.IsActive,
                _props.ID
            ];
        } else {
            sql = "INSERT INTO q_user (" +
                    "`last_name`," +
                    "`first_name`," +
                    "`middle_name`," +
                    "`email`," +
                    "`username`," +
                    "`password`," +
                    "`is_admin`," +
                    "`is_active`," +
                    "`created_by`," +
                    "`created_at`" +
                  ") VALUES (?,?,?,?,?,MD5(?),?,?,?,NOW())";
            values = [
                _props.LastName,
                _props.FirstName,
                _props.MiddleName,
                _props.Email,
                _props.Username,
                _props.Password,
                _props.IsAdmin,
                _props.IsActive,
                _props.CreatedBy
            ];
        }

        db.Query(sql, values, function(err, result){
            _props.Password = "";
            try {
                if (_props.ID < 1 && result && "insertId" in result) {
                    _props.ID = +result.insertId;
                }
            } catch (err) {
                cb.call(_this, err);
            }
            
            cb.call(_this, err);
        });
    }

    function _delete(db, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }
        
        let sql = "DELETE FROM q_user WHERE `id`=?";
        db.Query(sql, [_props.ID], function(err, result){
            _props.ID = 0;
            _props.LastName = "";
            _props.FirstName = "";
            _props.MiddleName = "";
            _props.Email = "";
            _props.Username = "";
            _props.Password = "";
            _props.IsAdmin = 0;
            _props.IsActive = 0;
            _props.CreatedBy = 0;
            _props.CreatedAt = 0;
            cb.call(_this, err);
        });
    }

    function _fields(raw) {
        let fields = [];
        if (raw) {
            for (let prop in _props) {
                fields.push(_toSnakeCase(prop));
            }
        } else {
            for (let prop in _props) {
                fields.push(prop);
            }
        }
        return fields;
    }

    function _login(db, cb) {
        if (!_props.Username || _props.Username === "" || !_props.Password || _props.Password === "") {
            cb.call(_this, new Error("Invalid `Username` or `Password`"));
            return;
        }

        _filter(db, {"username":_props.Username,"password":_props.Password}, true, function(err, rawUsers){
            if (rawUsers.length > 0) {
                let rawUser = rawUsers[0];
                for (let prop in _props) {
                    if (prop === "Password") {
                        continue;
                    }

                    let col = _toSnakeCase(prop);
                    _props[prop] = rawUser[col];
                }
            }

            cb.call(_this, err, rawUsers.length === 1);
        });
    }

    function _changePassword(db, newPassword, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }

        if (newPassword === "") {
            cb.call(_this, new Error("`New Password` cannot be empty"));
            return;
        }

        let sql = "UPDATE q_user SET `password`=MD5(?) WHERE `id`=?",
            values = [newPassword, _props.ID];
        db.Query(sql, values, function(err, result){
            cb.call(_this, err);
        });
    }

    function _toSnakeCase(str) {
        return str.replace(/\.?([A-Z]+)/g, function(x, y){
                return "_" + y.toLowerCase()
            }).replace(/^_/, "");
    }

    return _this;
}

module.exports = User;