const crypto = require("crypto");
const User = require("./user");

function Session(props, raw) {
    "using strict";

    var _props = {
            "UserID": 0,
            "Key": "",
            "Datetime": ""
        },
        _user = new User(),
        _this = {
            "Get": _get,
            "Set": _set,
            "Raw": _raw,
            "All": _all,
            "Load": _load,
            "Filter": _filter,
            "Save": _save,
            "Delete": _delete,
            "Fields": _fields
        };

    if (props && props instanceof Object) {
        if (raw) {
            for (let prop in _props) {
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
        if (prop === "User") {
            return _user;
        } else {
            if (prop in _props) {
                return _props[prop];
            }
        }
        return null;
    }

    function _set(prop, value) {
        switch (prop) {
            case "UserID":
                // ** cast into integer **
                _props[prop] = +value;
                break;
            case "Key":
            case "Datetime":
                // ** don't allow to overwrite **
                break;
            case "User":
                if (value && value instanceof Object) {
                    _user = value;
                }
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
        obj["user"] = _user.Raw();
        return obj;
    }

    function _all(db, raw, cb) {
        _filter(db, null, raw, cb);
    }

    function _load(db, cb) {
        let params = {};
        if (_props.Key !== "") {
            params["key"] = _props.Key;
        } else if (_props.UserID > 0) {
            params["user_id"] = _props.UserID;
        } else {
            cb.call(_this, new Error("Unable to load session."));
            return;
        }

        _filter(db, params, true, function(err, rawSessions){
            if (rawSessions.length > 0) {
                let rawSession = rawSessions[0];
                for (let prop in _props) {
                    let col = _toSnakeCase(prop);
                    _props[prop] = rawSession[col];
                }
                _user = new User(rawSession.user, true);
            }

            cb.call(_this, err);
        });
    }

    function _filter(db, params, raw, cb) {
        let sql = "SELECT * FROM q_session AS a LEFT OUTER JOIN q_user AS b ON b.`id` = a.`user_id`",
            values = [];
        
        if (params) {
            let sqlPlaceHolders = [];

            if ("key" in params) {
                sqlPlaceHolders.push("a.`key`=?");
                values.push(params.key);
            }
                
            if ("user_id" in params) {
                sqlPlaceHolders.push("b.`user_id`=?");
                values.push(params.user_id);
            }

            if (sqlPlaceHolders.length > 0) {
                sql += " WHERE " + sqlPlaceHolders.join(" AND ");
            }
        }
        
        sql += " ORDER BY a.`datetime` DESC";

        db.Select(sql, values, function(err, result){
            let sessions = [],
                sessionFields = _fields(true),
                userFields = _user.Fields(true);
            if (raw) {
                for (let row of result) {
                    let session = {};
                    for (let col of sessionFields) {
                        if (col in row) {
                            session[col] = row[col];
                        }
                    }

                    session["user"] = {};
                    for (let col of userFields) {
                        if (col in row) {
                            session.user[col] = row[col];
                        }
                    }
                    sessions.push(session);
                }
            } else {
                for (let row of result) {
                    let sRawValues = {};
                    for (let col of sessionFields) {
                        if (col in row) {
                            sRawValues[col] = row[col];
                        }
                    }
                    session = new Session(sRawValues, true);

                    let uRawValues = {};
                    for (let col of userFields) {
                        if (col in row) {
                            uRawValues = row[col];
                        }
                    }
                    session.Set("User", new User(uRawValues, true));

                    sessions.push(session);
                }
            }
            
            cb.call(_this, err, sessions);
        });
    }

    function _save(db, cb) {
        _props.Key = _generateKey();
        let sql = "INSERT INTO q_session (`user_id`,`key`,`datetime`) VALUES (?,?,Now()) " +
                  "ON DUPLICATE KEY UPDATE " +
                  "`key`=?," +
                  "`datetime`=NOW()",
            values = [
                _props.UserID,
                _props.Key,
                _props.Key
            ];
        
        db.Query(sql, values, function(err, result){
            cb.call(_this, err);
        });
    }

    function _delete(db, cb) {
        let sql = "",
            values = [];
        if (_props.Key !== "") {
            sql = "DELETE FROM q_session WHERE `key`=?"
            values = [_props.Key];
        } else if (_props.UserID > 0) {
            sql = "DELETE FROM q_session WHERE `user_id`=?"
            values = [_props.UserID];
        } else {
            cb.call(_this, new Error("Unable to delete session."));
            return;
        }
        
        db.Query(sql, values, function(err, result){
            _props.UserID = 0;
            _props.Key = "";
            _props.Datetime = "";
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

    function _generateKey() {
        return crypto.createHash("md5").update((_props.UserID + +new Date()) + "").digest("hex");
    }

    function _toSnakeCase(str) {
        return str.replace(/\.?([A-Z]+)/g, function(x, y){
                return "_" + y.toLowerCase()
            }).replace(/^_/, "");
    }

    return _this;
}

module.exports = Session;