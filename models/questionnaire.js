const Question = require("./question");

function Questionnaire(props, raw) {
    "using strict";

    var _props = {
            "ID": 0,
            "Name": "",
            "Description": "",
            "CategoryID": 0,
            "Category": "",
            "SubCategoryID": 0,
            "SubCategory": "",
            "AllowBack": 0,
            "AllowSkip": 0,
            "NoOfQuestions": 0,
            "PassingScore": 0,
            "TimeLimit": 0,
            "Random": 0,
            "IsActive": 0,
            "CreatedBy": 0,
            "CreatedAt": 0
        },
        _questions = [],
        _this = {
            "Get": _get,
            "Set": _set,
            "Raw": _raw,
            "All": _all,
            "Load": _load,
            "Filter": _filter,
            "Save": _save,
            "Delete": _delete,
            "LoadQuestions": _loadQuestions,
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
            case "AllowBack":
            case "AllowSkip":
            case "Random":
            case "IsAactive":
                // ** cast into boolean **
                return !!_props[prop];
            case "Questions":
                return _questions;
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
            case "AllowBack":
            case "AllowSkip":
            case "IsActive":
            case "Random":
                // ** cast into integer **
                _props[prop] = +value;
                break;
            case "Category":
            case "SubCategory":
            case "CreatedAt":
                // ** don't allow to overwrite **
                break;
            case "Question":
                if (value && value instanceof Object) {
                    _questions.push(value);
                }
                break;
            case "Questions":
                if (value instanceof Array) {
                    _questions = value;
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
        obj["questions"] = [];
        for (let question of _questions) {
            obj.questions.push(question.Raw());
        }
        return obj;
    }

    function _all(db, raw, cb) {
        _filter(db, null, raw, cb);
    }

    function _load(db, includeQuestions, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }

        _filter(db, {"id":_props.ID}, true, function(err, rawQuestionnaires){
            if (rawQuestionnaires.length > 0) {
                let rawQuestionnaire = rawQuestionnaires[0];
                for (let prop in _props) {
                    let col = _toSnakeCase(prop);
                    _props[prop] = rawQuestionnaire[col];
                }
            }

            if (includeQuestions) {
                _loadQuestions(db, cb);
            } else {
                cb.call(_this, err);
            }
        });
    }

    function _filter(db, params, raw, cb) {
        let sql = "SELECT " +
                    "a.*," +
                    "b.`name` AS category," +
                    "c.`name` AS sub_category " +
                  "FROM " +
                    "q_questionnaire AS a " +
                    "LEFT OUTER JOIN q_category AS b ON b.`id` = a.`id` " +
                    "LEFT OUTER JOIN q_sub_category AS c ON c.`id` = a.`id`",
            values = [];
        
        if (params) {
            let sqlPlaceHolders = [];
            
            if ("id" in params) {
                sqlPlaceHolders.push("a.`id`=?");
                values.push(params.id);
            } else {
                if ("category_id" in params) {
                    sqlPlaceHolders.push("b.`id`=?");
                    values.push(params.category_id);
                }

                if ("sub_category_id" in params) {
                    sqlPlaceHolders.push("c.`id`=?");
                    values.push(params.sub_category_id);
                }

                if ("active" in params) {
                    sqlPlaceHolders.push("a.`is_active`=?");
                    values.push(params.active);
                }

                if ("keyword" in params) {
                    let keyword = "%" + params.keyword + "%";
                    sqlPlaceHolders.push("(a.`name` LIKE ?)");
                    values.push(keyword);
                }
            }

            if (sqlPlaceHolders.length > 0) {
                sql += " WHERE " + sqlPlaceHolders.join(" AND ");
            }
        }
        sql += " ORDER BY a.`id`";

        db.Select(sql, values, function(err, result){
            let questionnaires = [];
            if (result && result.length > 0) {
                if (raw) {
                    questionnaires = result;
                } else {
                    for (let row of result) {
                        questionnaires.push(new Questionnaire(row, true));
                    }
                }
            }
            
            cb.call(_this, err, questionnaires);
        });
    }

    function _save(db, cb) {
        let sql = "",
            values = [];

        if (_props.ID > 0) {
            sql = "UPDATE q_questionnaire SET " +
                    "`name`=?," +
                    "`description`=?," +
                    "`category_id`=?," +
                    "`sub_category_id`=?," +
                    "`allow_back`=?," +
                    "`allow_skip`=?," +
                    "`no_of_questions`=?," +
                    "`passing_score`=?," +
                    "`time_limit`=?," +
                    "`random`=? " +
                  "WHERE id=?";
            values = [
                _props.Name,
                _props.Description,
                _props.CategoryID,
                _props.SubCategoryID,
                _props.AllowBack,
                _props.AllowSkip,
                _props.NoOfQuestions,
                _props.PassingScore,
                _props.TimeLimit,
                _props.Random,
                _props.ID
            ];
        } else {
            sql = "INSERT INTO q_questionnaire (" +
                    "`name`," +
                    "`description`," +
                    "`category_id`," +
                    "`sub_category_id`," +
                    "`allow_back`," +
                    "`allow_skip`," +
                    "`no_of_questions`," +
                    "`passing_score`," +
                    "`time_limit`," +
                    "`random`," +
                    "`created_by`," +
                    "`created_at`" +
                  ") VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())";
            values = [
                _props.Name,
                _props.Description,
                _props.CategoryID,
                _props.SubCategoryID,
                _props.AllowBack,
                _props.AllowSkip,
                _props.NoOfQuestions,
                _props.PassingScore,
                _props.TimeLimit,
                _props.Random,
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
            
            if (_props.Random === 0 && _questions.length > 0) {
                _saveQuestions(db, cb);
            } else {
                cb.call(_this, err);
            }
        });
    }

    function _delete(db, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }
        
        let sql = "DELETE FROM q_questionnaire WHERE `id`=?";
        db.Query(sql, [_props.ID], function(err, result){
            _deleteQuestions(db, function(err){
                _props.ID = 0;
                _props.Name = "";
                _props.Description = "";
                _props.CategoryID = 0;
                _props.Category = "";
                _props.SubCategoryID = 0;
                _props.SubCategory = "";
                _props.AllowBack = 0;
                _props.AllowSkip = 0;
                _props.NoOfQuestions = 0;
                _props.PassingScore = 0;
                _props.TimeLimit = 0;
                _props.Random = 0;
                _props.IsActive = 0;
                _props.CreatedBy = 0;
                _props.CreatedAt = 0;
                _questions = [];
                cb.call(_this, err);
            });
        });
    }

    function _loadQuestions(db, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }

        new Question().Filter(db, {"questionnaire_id":_props.ID}, false, function(err, questions){
            _questions = questions;
            cb.call(_this, err);
        });
    }

    function _saveQuestions(db, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }
        
        _deleteQuestions(db, function(err){
            if (_questions.length > 0) {
                let sqlPlaceHolders = [],
                    values = [],
                    seq = 1;
    
                for (let question of _questions) {
                    sqlPlaceHolders.push("(?,?,?)");
                    values = values.concat([_props.ID, question.Get("ID"), seq]);
                    seq ++;
                }
    
                sql = "INSERT INTO q_questionnaire_questions VALUES " + sqlPlaceHolders.join(",");
                db.Query(sql, values, function(err, result){
                    cb.call(_this, err);
                });
            } else {
                cb.call(_this, new Error("No questions to save"));
            }
        });
    }
    
    function _deleteQuestions(db, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }

        let sql = "DELETE FROM q_questionnaire_questions WHERE `questionnaire_id`=?";
        db.Query(sql, [_props.ID], function(err, result){
            // _questions = [];
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

module.exports = Questionnaire;