const config = require("../../config.json");
const DB = require("../../db/db");

module.exports = (function(){
    function _handle(req, params, activeUser, model, id, cb) {
        switch (model) {
            case "questionnaire":
                _questionnaireHandler(req.method);
                break;
            case "question":
                _questionHandler(req.method);
                break;
            case "sub_category":
                _subCategoryHandler(req.method);
                break;
            default:
                cb(new Error("Invalid model"));
        }

        function _questionnaireHandler(method) {
            const Questionnaire = require("../../models/questionnaire");
            let questionnaire = new Questionnaire(),
                db = new DB(config.db.mysql);
            switch (method) {
                case "GET":
                    if (id > 0) {
                        questionnaire.Set("ID", id);
                        questionnaire.Load(db, true, function(err){
                            if (err) {
                                console.log(err);
                            }
                            
                            cb(err, this.Raw());
                        });
                    } else {
                        questionnaire.Filter(db, params, true, function(err, rawQuestionnaires){
                            if (err) {
                                console.log(err);
                            }

                            cb(err, rawQuestionnaires);
                        });
                    }
                    break;
                case "POST": break;
                case "DELETE": break;
            }
        }

        function _questionHandler(method) {
            const Question = require("../../models/question");
            let question = new Question(),
                db = new DB(config.db.mysql);
            switch (method) {
                case "GET":
                    if (id > 0) {
                        question.Set("ID", id);
                        question.Load(db, function(err){
                            if (err) {
                                console.log(err);
                            }
                            
                            cb(err, this.Raw());
                        });
                    } else {
                        question.Filter(db, params, true, function(err, rawQuestions){
                            if (err) {
                                console.log(err);
                            }

                            cb(err, rawQuestions);
                        });
                    }
                    break;
                case "POST": break;
                case "DELETE": break;
            }
        }

        function _subCategoryHandler(method) {
            const SubCategory = require("../../models/subCategory");
            let subCategory = new SubCategory(),
                db = new DB(config.db.mysql);
            switch (method) {
                case "GET":
                    if (id > 0) {
                        subCategory.Set("ID", id);
                        subCategory.Load(db, function(err){
                            if (err) {
                                console.log(err);
                            }
                            
                            cb(err, this.Raw());
                        });
                    } else {
                        subCategory.Filter(db, params, true, function(err, rawSubCategories){
                            if (err) {
                                console.log(err);
                            }

                            cb(err, rawSubCategories);
                        });
                    }
                    break;
                case "POST": // create/update
                    subCategory.Set("ID", id);
                    subCategory.Set("Name", params.name);
                    subCategory.Set("Description", params.description);
                    subCategory.Set("IsActive", params.is_active == 1);
                    subCategory.Set("CategoryID", params.category_id);
                    if (subCategory.Get("ID") === 0) {
                        subCategory.Set("CreatedBy", activeUser.Get("ID"));
                    }
                    subCategory.Save(db, function(err){
                        if (err) {
                            console.log(err);
                        }
                        
                        cb(err, this.Raw());
                    });
                    break;
                // case "PUT": // update
                //     break;
                case "DELETE":
                    subCategory.Set("ID", id);
                    subCategory.Delete(db, function(err){
                        if (err) {
                            console.log(err);
                        }
        
                        cb(err);
                    });
                    break;
            }
        }
    }

    return {
        "Handle": _handle
    };
})();