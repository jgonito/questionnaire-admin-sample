const SubCategory = require("./subCategory");

function Category(props, raw) {
    "using strict";

    var _props = {
            "ID": 0,
            "Name": "",
            "Description": "",
            "IsActive": 0,
            "CreatedBy": 0,
            "CreatedAt": 0
        },
        _subCategories = [],
        _this = {
            "Get": _get,
            "Set": _set,
            "Raw": _raw,
            "All": _all,
            "Load": _load,
            "Filter": _filter,
            "Save": _save,
            "Delete": _delete,
            "DeleteSubCategories": _deleteSubCategories,
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
            case "SubCategories":
                return _subCategories;
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
            case "SubCategory":
                if (value && value instanceof Object) {
                    _subCategories.push(value);
                }
                break;
            case "SubCategories":
                if (value instanceof Array) {
                    _subCategories = value;
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
        obj["sub_categories"] = [];
        for (let subCategory of _subCategories) {
            obj.sub_categories.push(subCategory.Raw());
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

        _filter(db, {"id":_props.ID}, true, function(err, rawCategories){
            if (rawCategories.length > 0) {
                let rawCategory = rawCategories[0];
                for (let prop in _props) {
                    let col = _toSnakeCase(prop);
                    _props[prop] = rawCategory[col];
                }

                for (let rawSubCategory of rawCategory.sub_categories) {
                    _subCategories.push(new SubCategory(rawSubCategory, true));
                }
            }

            cb.call(_this, err);
        });
    }

    function _filter(db, params, raw, cb) {
        let sql = "SELECT " +
                    "a.*," +
                    "b.`id` AS sub_category_id," +
                    "b.`name` AS sub_category_name," +
                    "b.`description` AS sub_category_description," +
                    "b.`is_active` AS sub_category_is_active," +
                    "b.`category_id`," +
                    "b.`created_by` AS sub_category_created_by," +
                    "b.`created_at` AS sub_category_created_at " +
                  "FROM " +
                    "q_category AS a " +
                    "LEFT OUTER JOIN q_sub_category AS b ON b.`category_id` = a.`id`",
                values = [];

        if (params) {
            let sqlPlaceHolders = [];

            if ("id" in params) {
                sqlPlaceHolders.push("a.`id`=?");
                values.push(params.id);
            } else {
                if ("sub_category_id" in params) {
                    sqlPlaceHolders.push("b.`id`=?");
                    values.push(params.sub_category_id);
                }

                if ("active" in params) {
                    sqlPlaceHolders.push("a.`is_active`=?");
                    values.push(params.active);
                }

                if ("keyword" in params) {
                    let keyword = "%" + params.keyword + "%";
                    sqlPlaceHolders.push("a.`name` LIKE ?");
                    values.push(keyword);
                }
            }

            if (sqlPlaceHolders.length > 0) {
                sql += " WHERE " + sqlPlaceHolders.join(" AND ");
            }
        }
        
        sql += " ORDER BY a.`id`,b.`id`";

        db.Select(sql, values, function(err, result){
            let categories = [],
                categoryFields = _fields(true),
                index = 0;
            if (raw) {
                for (let row of result) {
                    if (categories.length === 0 || categories[index].id !== row.id) {
                        let category = {};
                        for (let col of categoryFields) {
                            if (col in row) {
                                category[col] = row[col];
                            }
                        }
                        category["sub_categories"] = [];
                        categories.push(category);
                        index = categories.length - 1;
                    }

                    if (row.sub_category_id) {
                        let subCategory = {
                            "id": row.sub_category_id,
                            "name": row.sub_category_name,
                            "description": row.sub_category_description,
                            "is_active": row.sub_category_is_active,
                            "category_id": row.category_id,
                            "created_by": row.sub_category_created_by,
                            "created_at": row.sub_category_created_at
                        };
                        categories[index].sub_categories.push(subCategory);
                    }
                }
            } else {
                for (let row of result) {
                    if (categories.length === 0 || categories[index].Get("ID") != row.id) {
                        let rawValues = {};
                        for (let col of categoryFields) {
                            if (col in row) {
                                rawValues[col] = row[col];
                            }
                        }
                        categories.push(new Category(rawValues, true));
                        index = categories.length - 1;
                    }

                    if (row.sub_category_id) {
                        let rawValues = {
                            "id": row.sub_category_id,
                            "name": row.sub_category_name,
                            "description": row.sub_category_description,
                            "is_active": row.sub_category_is_active,
                            "category_id": row.category_id,
                            "created_by": row.sub_category_created_by,
                            "created_at": row.sub_category_created_at
                        };
                        categories[index].Set("SubCategory", new SubCategory(rawValues, true));
                    }
                }
            }
            cb.call(_this, err, categories);
        });
    }

    function _save(db, cb) {
        let sql = "",
            values = [];

        if (_props.ID > 0) {
            sql = "UPDATE q_category SET " +
                    "`name`=?," +
                    "`description`=?," +
                    "`is_active`=? " +
                  "WHERE `id`=?";
            values = [
                _props.Name,
                _props.Description,
                _props.IsActive,
                _props.ID
            ];
        } else {
            sql = "INSERT INTO q_category (" +
                    "`name`," +
                    "`description`," +
                    "`is_active`," +
                    "`created_by`," +
                    "`created_at`" +
                  ") VALUES (?,?,?,?,NOW())";
            values = [
                _props.Name,
                _props.Description,
                _props.IsActive,
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
        
        let sql = "DELETE FROM q_category WHERE `id`=?";
        db.Query(sql, [_props.ID], function(err, result){
            _deleteSubCategories(db, function(err){
                _props.ID = 0;
                _props.Name = "";
                _props.Description = "";
                _props.IsActive = 0;
                _props.CreatedBy = 0;
                _props.CreatedAt = 0;
                _subCategories = [];
                cb.call(_this, err);
            });
        });
    }

    function _deleteSubCategories(db, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }
        
        let sql = "DELETE FROM q_sub_category WHERE `category_id`=?";
        db.Query(sql, [_props.ID], function(err, result){
            _subCategories = [];
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

module.exports = Category;