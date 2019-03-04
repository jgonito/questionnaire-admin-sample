function Choice(props, raw) {
    "using strict";

    var _props = {
            "QuestionID": 0,
            "Letter": 0,
            "Details": "",
            "Correct": 0
        },
        _this = {
            "Get": _get,
            "Set": _set,
            "Raw": _raw,
            "Load": _load,
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
        switch (prop) {
            case "Correct":
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
            case "QuestionID":
            case "Correct":
                // ** cast into integer **
                _props[prop] = +value;
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

    function _load(db, cb) {
        if (isNaN(_props.QuestionID) || _props.QuestionID < 1) {
            cb.call(_this, new Error("Invalid `Question ID`"));
            return;
        }

        if (!_props.Letter || _props.Letter === "") {
            cb.call(_this, new Error("Invalid `Letter`"));
            return;
        }

        let sql = "SELECT * FROM q_choices WHERE `question_id`=? AND `letter`=?";
        db.Select(sql, [_props.QuestionID, _props.Letter], function(err, result){
            if (result.length == 1) {
                let row = result[0];
                for (let prop in _props) {
                    let col = _toSnakeCase(prop);
                    if (col in row) {
                        _props[prop] = row[col];
                    }
                }
            }
            cb.call(_this, err);
        });
    }

    function _save(db, cb) {
        let sql = "INSERT INTO q_choices (" +
                    "`question_id`," +
                    "`letter`," +
                    "`details`," +
                    "`correct`" +
                  ") VALUES (?,?,?,?) " +
                  "ON DUPLICATE KEY UPDATE " +
                  "`details`=?," +
                  "`correct`=?",
            values = [
                _props.QuestionID,
                _props.Letter,
                _props.Details,
                _props.Correct,
                _props.Details,
                _props.Correct
            ];

        db.Query(sql, values, function(err, result){
            cb.call(_this, err);
        });
    }

    function _delete(db, cb) {
        if (isNaN(_props.QuestionID) || _props.QuestionID < 1) {
            cb.call(_this, new Error("Invalid `Question ID`"));
            return;
        }

        if (_props.Letter === "") {
            cb.call(_this, new Error("Invalid `Letter`"));
            return;
        }
        
        let sql = "DELETE FROM q_choices WHERE `question_id`=? AND `letter`=?";
        db.Query(sql, [_props.QuestionID, _props.Letter], function(err, result){
            _props.QuestionID = 0;
            _props.Letter = "";
            _props.Details = "";
            _props.Correct = 0;
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

    function _toSnakeCase(str) {
        return str.replace(/\.?([A-Z]+)/g, function(x, y){
                return "_" + y.toLowerCase()
            }).replace(/^_/, "");
    }

    return _this;
}

module.exports = Choice;