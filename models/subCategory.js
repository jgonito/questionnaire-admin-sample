function SubCategory(props, raw) {
    "using strict";

    var _props = {
            "ID": 0,
            "Name": "",
            "Description": "",
            "IsActive": 0,
            "CategoryID": 0,
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

        _filter(db, {"id":_props.ID}, true, function(err, rawSubCategories){
            if (rawSubCategories.length > 0) {
                let rawSubCategory = rawSubCategories[0];
                for (let prop in _props) {
                    let col = _toSnakeCase(prop);
                    _props[prop] = rawSubCategory[col];
                }
            }

            cb.call(_this, err);
        });
    }

    function _filter(db, params, raw, cb) {
        let sql = "SELECT a.* FROM q_sub_category AS a",
            values = [];

        if (params) {
            let sqlPlaceHolders = [];

            if ("id" in params) {
                sqlPlaceHolders.push("a.`id`=?");
                values.push(params.id);
            } else {
                if ("active" in params) {
                    sqlPlaceHolders.push("a.`is_active`=?");
                    values.push(params.active);
                }

                if ("keyword" in params) {
                    let keyword = "%" + params.keyword + "%";
                    sqlPlaceHolders.push("a.`name` LIKE ?");
                    values.push(keyword);
                }

                if ("category_id" in params) {
                    sql += " LEFT OUTER JOIN q_category AS b ON b.`id` = a.`category_id`"
                    sqlPlaceHolders.push("b.`id`=?");
                    values.push(params.category_id);
                }
            }

            if (sqlPlaceHolders.length > 0) {
                sql += " WHERE " + sqlPlaceHolders.join(" AND ");
            }
        }
        
        sql += " ORDER BY a.`id`";

        db.Select(sql, values, function(err, result){
            let subCategories = [];
            if (raw) {
                subCategories = result;
            } else {
                for (let row of result) {
                    subCategories.push(new SubCategory(row, true));
                }
            }
            cb.call(_this, err, subCategories);
        });
    }

    function _save(db, cb) {
        let sql = "",
            values = [];

        if (_props.ID > 0) {
            sql = "UPDATE q_sub_category SET " +
                    "`name`=?," +
                    "`description`=?," +
                    "`is_active`=?," +
                    "`category_id`=? " +
                  "WHERE `id`=?";
            values = [
                _props.Name,
                _props.Description,
                _props.IsActive,
                _props.CategoryID,
                _props.ID
            ];
        } else {
            sql = "INSERT INTO q_sub_category (" +
                    "`name`," +
                    "`description`," +
                    "`is_active`," +
                    "`category_id`," +
                    "`created_by`," +
                    "`created_at`" +
                  ") VALUES (?,?,?,?,?,NOW())";
            values = [
                _props.Name,
                _props.Description,
                _props.IsActive,
                _props.CategoryID,
                _props.CreatedBy
            ];
        }

        db.Query(sql, values, function(err, result){
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
        
        let sql = "DELETE FROM q_sub_category WHERE `id`=?";
        db.Query(sql, [_props.ID], function(err, result){
            _props.ID = 0;
            _props.Name = "";
            _props.Description = "";
            _props.IsActive = 0;
            _props.CategoryID = 0;
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

    function _toSnakeCase(str) {
        return str.replace(/\.?([A-Z]+)/g, function(x, y){
                return "_" + y.toLowerCase()
            }).replace(/^_/, "");
    }

    return _this;
}

module.exports = SubCategory;