const Choice = require("./choice");

function Question(props, raw) {
    "using strict";

    var _props = {
            "ID": 0,
            "Question": "",
            "CategoryID": 0,
            "Category": "",
            "SubCategoryID": 0,
            "SubCategory": "",
            "ChoicesCount": 0,
            "IsActive": 0,
            "CreatedBy": 0,
            "CreatedAt": 0
        },
        _choices = [],
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
            case "Choices":
                return _choices;
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
            case "Category":
            case "SubCategory":
            case "CreatedAt":
                // ** don't allow to overwrite **
                break;
            case "Choice":
                if (value && value instanceof Object) {
                    _choices.push(value);
                }
                break;
            case "Choices":
                if (value instanceof Array) {
                    _choices = value;
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
        obj["choices"] = [];
        for (let choice of _choices) {
            obj.choices.push(choice.Raw());
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

        _filter(db, {"id":_props.ID}, true, function(err, rawQuestions){
            if (rawQuestions.length > 0) {
                let rawQuestion = rawQuestions[0];
                for (let prop in _props) {
                    let col = _toSnakeCase(prop);
                    _props[prop] = rawQuestion[col];
                }

                for (let rawChoice of rawQuestion.choices) {
                    _choices.push(new Choice(rawChoice, true));
                }
            }

            cb.call(_this, err);
        });
    }

    function _filter(db, params, raw, cb) {
        let sql = "SELECT " +
                    "a.*," +
                    "b.`name` AS category," +
                    "c.`name` AS sub_category," +
                    "d.`question_id`," +
                    "d.`letter`," +
                    "d.`details`," +
                    "d.`correct` " +
                  "FROM " +
                    "q_question AS a " +
                    "LEFT OUTER JOIN q_category AS b ON b.`id` = a.`category_id` " +
                    "LEFT OUTER JOIN q_sub_category AS c ON c.`id` = a.`sub_category_id` " +
                    "LEFT OUTER JOIN q_choices AS d ON d.`question_id` = a.`id`",
            orderby = "a.`id`,b.`id`",
            values = [];

        if (params) {
            let sqlPlaceHolders = [];

            if ("id" in params && +params.id > 0) {
                sqlPlaceHolders.push("a.`id`=?");
                values.push(params.id);
            } else {
                if ("category_id" in params && +params.category_id > 0) {
                    sqlPlaceHolders.push("b.`id`=?");
                    values.push(params.category_id);
                }

                if ("sub_category_id" in params && +params.sub_category_id > 0) {
                    sqlPlaceHolders.push("c.`id`=?");
                    values.push(params.sub_category_id);
                }

                if ("active" in params && !isNaN(params.active)) {
                    sqlPlaceHolders.push("a.`is_active`=?");
                    values.push(params.active);
                }

                if ("keyword" in params && params.keyword !== "") {
                    let keyword = "%" + params.keyword + "%";
                    sqlPlaceHolders.push("a.`question` LIKE ?");
                    values.push(keyword);
                }

                if ("questionnaire_id" in params && +params.questionnaire_id > 0) {
                    sql += " LEFT OUTER JOIN q_questionnaire_questions AS e ON e.`question_id` = a.`id`"
                    orderby = "e.`seq`";
                    sqlPlaceHolders.push("e.`questionnaire_id`=?");
                    values.push(params.questionnaire_id);
                }
            }

            if (sqlPlaceHolders.length > 0) {
                sql += " WHERE " + sqlPlaceHolders.join(" AND ");
            }
        }

        sql += " ORDER BY " + orderby;
        
        db.Select(sql, values, function(err, result){
            let questions = [],
                questionFields = _fields(true),
                index = 0;
            if (result && result.length > 0) {
                if (raw) {
                    for (let row of result) {
                        if (questions.length === 0 || questions[index].id !== row.id) {
                            let question = {};
                            for (let col of questionFields) {
                                if (col in row) {
                                    question[col] = row[col];
                                }
                            }
                            question["choices"] = [];
                            questions.push(question);
                            index = questions.length - 1;
                        }

                        if (row.letter) {
                            let choice = {
                                "question_id": row.question_id,
                                "letter": row.letter,
                                "details": row.details,
                                "correct": row.correct
                            };
                            questions[index].choices.push(choice);
                        }
                    }
                } else {
                    for (let row of result) {
                        if (questions.length === 0 || questions[index].Get("ID") != row.id) {
                            let rawValues = {};
                            for (let col of questionFields) {
                                if (col in row) {
                                    rawValues[col] = row[col];
                                }
                            }
                            questions.push(new Question(rawValues, true));
                            index = questions.length - 1;
                        }

                        if (row.letter) {
                            let rawValues = {
                                "question_id": row.question_id,
                                "letter": row.letter,
                                "details": row.details,
                                "correct": row.correct
                            };
                            questions[index].Set("Choice", new Choice(rawValues, true));
                        }
                    }
                }
            }
            cb.call(_this, err, questions);
        });
    }

    function _save(db, cb) {
        let sql = "",
            values = [];

        if (_props.ID > 0) {
            sql = "UPDATE q_question SET " +
                    "`question`=?," +
                    "`category_id`=?," +
                    "`sub_category_id`=?," +
                    "`choices_count`=?," +
                    "`is_active`=? " +
                  "WHERE `id`=?";
            values = [
                _props.Question,
                _props.CategoryID,
                _props.SubCategoryID,
                _props.ChoicesCount,
                _props.IsActive,
                _props.ID
            ];
        } else {
            sql = "INSERT INTO q_question (" +
                    "`question`," +
                    "`category_id`," +
                    "`sub_category_id`," +
                    "`choices_count`," +
                    "`is_active`," +
                    "`created_by`," +
                    "`created_at`" +
                  ") VALUES (?,?,?,?,?,?,?,NOW())";
            values = [
                _props.Question,
                _props.CategoryID,
                _props.SubCategoryID,
                _props.ChoicesCount,
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
            
            if (_choices.length > 0) {
                _saveChoices(db, cb);
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
        
        let sql = "DELETE FROM q_question WHERE `id`=?";
        db.Query(sql, [_props.ID], function(err, result){
            _deleteChoices(db, function(err){
                _props.ID = 0;
                _props.Question = "";
                _props.CategoryID = 0;
                _props.Category = "";
                _props.SubCategoryID = 0;
                _props.SubCategory = "";
                _props.IsActive = 0;
                _props.CreatedBy = 0;
                _props.CreatedAt = 0;
                _choices = [];
                cb.call(_this, err);
            });
        });
    }

    function _saveChoices(db, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }
        
        _deleteChoices(db, function(err){
            if (_choices.length > 0) {
                let sqlPlaceHolders = [],
                    values = [];
    
                for (let choice of _choices) {
                    choice = choice.Raw();
                    sqlPlaceHolders.push("(?,?,?,?)");
                    values = values.concat([_props.ID, choice.letter, choice.details, choice.correct]);
                }
    
                sql = "INSERT INTO q_choices VALUES " + sqlPlaceHolders.join(",");
                db.Query(sql, values, function(err, result){
                    cb.call(_this, err);
                });
            } else {
                cb.call(_this, new Error("No choices to save"));
            }
        });
    }

    function _deleteChoices(db, cb) {
        if (isNaN(_props.ID) || _props.ID < 1) {
            cb.call(_this, new Error("Invalid `ID`"));
            return;
        }
        
        let sql = "DELETE FROM q_choices WHERE `question_id`=?";
        db.Query(sql, [_props.ID], function(err, result){
            // _choices = [];
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

module.exports = Question;