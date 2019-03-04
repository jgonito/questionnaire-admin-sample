const handlebars = require("handlebars");
const qs = require("querystring");
const Cookies = require('cookies')
const http = require("http");
const path = require("path");
const url = require("url");
const fs = require("fs");

const Questionnaire = require("./models/questionnaire");
const Question = require("./models/question");
const Choice = require("./models/choice");
const Category = require("./models/category");
const User = require("./models/user");
const Session = require("./models/session");

const config = require("./config.json");
const DB = require("./db/db");

// ref: https://gist.github.com/Wilfred/715ae4e22642cfff1dbd
handlebars.loadPartial = function(name){
    var partial = handlebars.partials[name];
    if (typeof partial === "string") {
        partial = handlebars.compile(partial);
        handlebars.partials[name] = partial;
    }
    return partial;
};

handlebars.registerHelper("block", function(name, options){
    var partial = handlebars.loadPartial(name) || options.fn;
    return partial(this, {"data":options.hash});
});

handlebars.registerHelper("partial", function(name, options){
    handlebars.registerPartial(name, options.fn);
});

handlebars.registerHelper("jsonify", function(obj) {
    if (obj && obj instanceof Object) {
        (function _loop(obj){
            for (var k in obj) {
                if (obj.hasOwnProperty(k)) {
                    var v = obj[k];
                    switch (typeof v) {
                        case "string":
                        obj[k] = v.replace(/\'/g, "&#39;");
                        break;
                    case "object":
                        _loop(v);
                        break;
                    }
                }
            }
        })(obj);
        
        return JSON.stringify(obj);
    }
    return "";
});

handlebars.registerHelper("charToAscii", function(char){
    if (typeof char === "string" && char.length > 0) {
        return char.charCodeAt(0);
    }
    return -1;
});

handlebars.registerHelper("ifeq", function(obj1, obj2, options) {
    return obj1 == obj2 ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper("sum", function(n1, n2){
    return +n1 + +n2;
});

const base = fs.readFileSync("./pages/template/base.html", "utf8");
handlebars.registerPartial("base", base);

http.createServer(function(req, res){
    let urlObj = url.parse(req.url, true),
        pathName = "." + urlObj.pathname,
        pathObj = path.parse(pathName),
        ext = pathObj.ext;
    
    if (ext !== "") {
        // ** static handler **
        if (fs.existsSync(pathName)) {
            let contentType = "text/plain";
            switch (ext.replace(".", "")) {
                case "html":
                    contentType = "text/html";
                    break;
                case "js":
                    contentType = "text/javascript";
                    break;
                case "css":
                    contentType = "text/css";
                    break;
                case "png":
                    contentType = "image/png";
                    break;
                case "jpg":
                    contentType = "image/jpg";
                    break;
                case "ico":
                    contentType = "image/icon";
                    break;
            }
        
            fs.readFile(pathName, function(err, content){
                if (err) {
                    console.log(err);
                }
        
                res.writeHead(200, {"Content-Type":contentType});
                res.end(content);
            });
        } else {
            // console.log(pathName + " not exists.");
        }

        return;
    }
    
    let reqBody = "",
        params = {};

    req.on("data", function(data) {
        reqBody += data;
        if (reqBody.length > 1e7) { // 10mb
            responseError("Request Entity Too Large.", 413);
        }
    });

    req.on("end", function(){
        params = reqBody !== "" ? qs.parse(reqBody) : urlObj.query;
        main();
    });

    function main() {
        let pathParts = urlObj.pathname.replace(/^\/|\/$/g, "").split("/"),
            cookies = new Cookies(req, res),
            sessionKey = cookies.get("qsession-key");
        
        // ** admin page handler **
        if (pathParts[0] === "admin") {
            let pageReq = pathParts[1] || "",
                action = pathParts.length > 2 ? pathParts[2] : "";
            
            // ** serve admin login page **
            if (pageReq === "") {
                let context = {};
                if (params && params.status) {
                    statusMessages = [
                        null,
                        {"type":"success","text":"Logged out successfully!"},
                        {"type":"danger","text":"'Username' or 'Password' cannot be empty."},
                        {"type":"danger","text":"Invalid or unauthorized User."},
                        {"type":"danger","text":"Internal server error."}
                    ],
                    context = {"message":statusMessages[(+params.status || 0)] || null};
                }
                renderPage("./pages/admin/login.html", context);
                return;
            }
            
            // ** handle admin login attempt **
            if (pageReq === "login") {
                loginHandler();
                return;
            }
    
            if (sessionKey === "") {
                res.writeHead(302, {"Location":"/admin/?status=3"});
                res.end();
                return;
            }
            
            let db = new DB(config.db.mysql);
            new Session({"key":sessionKey}, true).Load(db, function(err){
                if (err) {
                    console.log(err);
                }
                let activeUser = this.Get("User");

                // ** validate admin user **
                if (activeUser.Get("ID") === 0 || !activeUser.Get("IsAdmin")) {
                    res.writeHead(302, {"Location":"/admin/?status=3"});
                    res.end();
                    return;
                }

                // ** admin page handlers **
                switch (pageReq) {
                    case "logout":
                        logoutHandler();
                        return;
                    case "change_password":
                        changePasswordHandler(activeUser);
                        return;
                    case "questionnaires":
                        questionnaireHandler(action, activeUser);
                        return;
                    case "questions":
                        questionHandler(action, activeUser);
                        return;
                    case "categories":
                        categoryHandler(action, activeUser);
                        return;
                    case "users":
                        userHandler(action, activeUser);
                        return;
                }
            });
        }
        
        // ** api handler **
        else if (pathParts[0] === "api") {
            let version = pathParts[1] || "",
                model = pathParts[2] || "",
                id = +pathParts[3] || 0;

            // ** validate api version & dir. **
            if (version === "") {
                responseError("Invaid api version directory",  404);
                return;
            }

            let apiDir = "./api/" + version + "/";
            try {
                let stats = fs.lstatSync(apiDir);
                if (!stats.isDirectory()) {
                    responseError("Invaid api version directory",  404);
                    return;
                }
            } catch (err) {
                responseError(err, 500);
                return;
            }

            let db = new DB(config.db.mysql);
            new Session({"key":sessionKey}, true).Load(db, function(err){
                let context = {
                    "status": "OK",
                    "message": "success"
                };

                if (err) {
                    context.status = "ERROR";
                    context.message = err;
                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify(context));
                    return;
                }
                let activeUser = this.Get("User");
                
                const API = require(apiDir + "api");
                API.Handle(req, params, activeUser, model, id, function(err, data){
                    if (err) {
                        console.log(err);
                        context.status = "ERROR";
                        context.message =  err;
                    }

                    if (data) {
                        context["data"] =  data;
                    }

                    res.writeHead(200, {"Content-Type":"application/json"});
                    res.end(JSON.stringify(context));
                });
            })
        }


        // ** client handler **
        else {
            // TODO: implementation
        }


        // ** admin handlers **
        function loginHandler() {
            let username = params.username,
                password = params.password;
            
            if (username === "" || password === "") {
                res.writeHead(302, {"Location":"/admin/?status=2"});
                res.end();
                return;
            }
            
            let db = new DB(config.db.mysql);
            new User({"Username":username,"Password":password}).Login(db, function(err, valid){
                if (err) {
                    console.log(err);
                    res.writeHead(302, {"Location":"/admin/?status=4"});
                    res.end();
                    return;
                }

                let user = this;
                if (!valid || !user.Get("IsAdmin")) {
                    res.writeHead(302, {"Location":"/admin/?status=3"});
                    res.end();
                    return;
                }

                new Session({"user_id":user.Get("ID")}, true).Save(db, function(err){
                    if (err) {
                        console.log(err);
                        res.writeHead(302, {"Location":"/admin/?status=4"});
                        res.end();
                        return;
                    }
        
                    let session = this;
                    cookies.set("qsession-key", session.Get("Key"), {
                        // ** session cookie expires on 30 days **
                        "expires": new Date(+new Date() + 30 * 24 * 60 * 60 * 1000),
                        "overwrite": true
                    });
                    res.writeHead(302, {"Location":"/admin/questionnaires/"});
                    res.end();
                });
            });
        }
        
        function logoutHandler() {
            let db = new DB(config.db.mysql);
            new Session({"key":sessionKey}, true).Delete(db, function(err){
                if (err) {
                    console.log(err);
                }
                
                cookies.set("qsession-key"); // ** omit cookie value to destroy **
                res.writeHead(302, {"Location":"/admin/?status=1"});
                res.end();
            });
        }

        function changePasswordHandler(activeUser) {
            let oldPassword = params.old_password,
                newPassword = params.new_password;
            
            if (oldPassword === "" || newPassword === "") {
                res.writeHead(302, {"Location":"/admin/?status=2"});
                res.end();
                return;
            }

            let db = new DB(config.db.mysql);
            new User().Filter(db, {
                "username": activeUser.Get("Username"),
                "password": oldPassword
            }, false, function(err, users){
                if (err) {
                    console.log(err);
                }

                if (users.length !== 0) {
                    let user = users[0];
                    if (user.Get("ID") !== activeUser.Get("ID")) {
                        // ** TODO: handle redirection for invalid user **
                    } else {
                        user.ChangePassword(db, newPassword, function(err){
                            if (err) {
                                console.log(err);
                            }

                            logoutHandler();
                        });
                    }
                } else {
                    // ** TODO: handle redirection for invalid user **
                }
            });
        }

        function questionnaireHandler(action, activeUser) {
            let db = new DB(config.db.mysql),
                questionnaire = new Questionnaire(),
                statusMessages = [
                    null,
                    {"type":"success","text":"Questionnaire added successfully!"},
                    {"type":"success","text":"Questionnaire updated successfully!"},
                    {"type":"danger","text":"Error saving questionnaire."},
                    {"type":"success","text":"Questionnaire deleted successfully!"},
                    {"type":"danger","text":"Error deleting questionnaire."}
                ],
                context = {
                    "active_user": activeUser.Raw(),
                    "title": "Questionnaire",
                    "message": statusMessages[(+params.status || 0)]
                },
                status = 0;

            ("id" in params) && (params.id = +params.id || 0);
            switch (action) {
                case "new":
                    new Category().All(db, true, function(err, rawCategories){
                        if (err) {
                            console.log(err);
                        }

                        context["categories"] = rawCategories;
                        renderPage("./pages/admin/questionnaire.form.html", context);
                    });
                    break;
                case "edit":
                    questionnaire.Set("ID", params.id);
                    // ** load questions only if not set to random **
                    questionnaire.Load(db, !questionnaire.Get("Random"), function(err){
                        if (err) {
                            console.log(err);
                        }

                        context["questionnaire"] = this.Raw();
                        new Category().All(db, true, function(err, rawCategories){
                            if (err) {
                                console.log(err);
                            }
    
                            context["categories"] = rawCategories;
                            renderPage("./pages/admin/questionnaire.form.html", context);
                        });
                    });
                    break;
                case "save":
                    status = 2;
                    questionnaire.Set("ID", params.id);
                    questionnaire.Set("Name", params.name);
                    questionnaire.Set("Description", params.description);
                    questionnaire.Set("CategoryID", params.category);
                    questionnaire.Set("SubCategoryID", params.sub_category);
                    questionnaire.Set("AllowBack", !!params.allow_back);
                    questionnaire.Set("AllowSkip", !!params.allow_skip);
                    questionnaire.Set("NoOfQuestions", params.no_of_questions);
                    questionnaire.Set("PassingScore", params.passing_score);
                    questionnaire.Set("TimeLimit", params.time_limit);
                    questionnaire.Set("Random", !!params.random);
                    questionnaire.Set("IsActive", !!params.is_active);
                    if (questionnaire.Get("ID") === 0) {
                        status = 1;
                        questionnaire.Set("CreatedBy", activeUser.Get("ID"));
                    }

                    if (!questionnaire.Get("Random")) {
                        let questionIDs = params["question[]"];
                        for (let questionID of questionIDs) {
                            questionnaire.Set("Question", new Question({"ID":questionID}));
                        }
                    }

                    questionnaire.Save(db, function(err){
                        if (err) {
                            status = 3;
                            console.log(err);
                        }
                        
                        res.writeHead(302, {"Location":"/admin/questionnaires/edit/?id=" + questionnaire.Get("ID") + "&status=" + status});
                        res.end();
                    });
                    break;
                case "delete":
                    status = 4;
                    questionnaire.Set("ID", params.id);
                    questionnaire.Delete(db, function(err){
                        if (err) {
                            status = 5;
                            console.log(err);
                        }
        
                        res.writeHead(302, {"Location":"/admin/questionnaires/?status=" + status});
                        res.end();
                    });
                    break;
                default:
                    questionnaire.Filter(db, params, true, function(err, rawQuestionnaires){
                        if (err) {
                            console.log(err);
                        }

                        context["questionnaires"] = rawQuestionnaires;
                        renderPage("./pages/admin/questionnaire.list.html", context);
                    });  
            }
        }
        
        function questionHandler(action, activeUser) {
            let db = new DB(config.db.mysql),
                question = new Question(),
                statusMessages = [
                    null,
                    {"type":"success","text":"Question added successfully!"},
                    {"type":"success","text":"Question updated successfully!"},
                    {"type":"danger","text":"Error saving question."},
                    {"type":"success","text":"Question deleted successfully!"},
                    {"type":"danger","text":"Error deleting question."}
                ],
                context = {
                    "active_user": activeUser.Raw(),
                    "title": "Question",
                    "message": statusMessages[(+params.status || 0)]
                },
                status = 0;

            ("id" in params) && (params.id = +params.id || 0);
            switch (action) {
                case "new":
                    var defaultChoices = [
                            new Choice({"Letter":"A"}),
                            new Choice({"Letter":"B"}),
                            new Choice({"Letter":"C"}),
                            new Choice({"Letter":"D"})
                        ];
                    question.Set("Choices", defaultChoices);
                    question.Set("ChoicesCount", defaultChoices.length);
                    context["question"] = question.Raw();
                    
                    new Category().All(db, true, function(err, rawCategories){
                        if (err) {
                            console.log(err);
                        }

                        context["categories"] = rawCategories;
                        renderPage("./pages/admin/question.form.html", context);
                    });
                    break;
                case "edit":
                    question.Set("ID", params.id);
                    question.Load(db, function(err){
                        if (err) {
                            console.log(err);
                        }

                        context["question"] = this.Raw();
                        new Category().All(db, true, function(err, rawCategories){
                            if (err) {
                                console.log(err);
                            }
    
                            context["categories"] = rawCategories;
                            renderPage("./pages/admin/question.form.html", context);
                        });
                    });
                    break;
                case "save":
                    status = 2;
                    question.Set("ID", params.id);
                    question.Set("Question", params.question);
                    question.Set("CategoryID", params.category);
                    question.Set("SubCategoryID", params.sub_category);
                    question.Set("ChoicesCount", params.choices_count);
                    question.Set("IsActive", !!params.is_active);
                    if (question.Get("ID") === 0) {
                        status = 1;
                        question.Set("CreatedBy", activeUser.Get("ID"));
                    }
                    
                    let choicesCount = params["choice[letter]"].length,
                        correct = params["choice[correct]"];
                    for (let i = 0; i < choicesCount; i ++) {
                        let letter = params["choice[letter]"][i],
                            details = params["choice[details]"][i];
                        
                        question.Set("Choice", new Choice({
                            "letter": letter,
                            "details": details,
                            "correct": (correct == letter ? 1 : 0)
                        }, true));
                    }

                    question.Save(db, function(err){
                        if (err) {
                            status = 3;
                            console.log(err);
                        }
                        
                        res.writeHead(302, {"Location":"/admin/questions/edit/?id=" + question.Get("ID") + "&status=" + status});
                        res.end();
                    });
                    break;
                case "delete":
                    status = 4;
                    question.Set("ID", params.id);
                    question.Delete(db, function(err){
                        if (err) {
                            status = 5;
                            console.log(err);
                        }
        
                        res.writeHead(302, {"Location":"/admin/questions/?status=" + status});
                        res.end();
                    });
                    break;
                default:
                    question.Filter(db, params, true, function(err, rawQuestions){
                        if (err) {
                            console.log(err);
                        }

                        context["questions"] = rawQuestions;
                        renderPage("./pages/admin/question.list.html", context);
                    });  
            }
        }
        
        function categoryHandler(action, activeUser) {
            let db = new DB(config.db.mysql),
                category = new Category(),
                statusMessages = [
                    null,
                    {"type":"success","text":"Category added successfully!"},
                    {"type":"success","text":"Category updated successfully!"},
                    {"type":"danger","text":"Error saving category."},
                    {"type":"success","text":"Category deleted successfully!"},
                    {"type":"danger","text":"Error deleting category."}
                ],
                context = {
                    "active_user": activeUser.Raw(),
                    "title": "Category",
                    "message": statusMessages[(+params.status || 0)]
                },
                status = 0;

            ("id" in params) && (params.id = +params.id || 0);
            switch (action) {
                case "new":
                    renderPage("./pages/admin/category.form.html", context);
                    break;
                case "edit":
                    category.Set("ID", params.id);
                    category.Load(db, function(err){
                        if (err) {
                            console.log(err);
                        }
        
                        context["category"] = this.Raw();
                        renderPage("./pages/admin/category.form.html", context);
                    });
                    break;
                case "save":
                    status = 2;
                    category.Set("ID", params.id);
                    category.Set("Name", params.name);
                    category.Set("Description", params.description);
                    category.Set("IsActive", !!params.is_active);
                    if (category.Get("ID") === 0) {
                        status = 1;
                        category.Set("CreatedBy", activeUser.Get("ID"));
                    }
                    category.Save(db, function(err){
                        if (err) {
                            status = 3;
                            console.log(err);
                        }
        
                        res.writeHead(302, {"Location":"/admin/categories/edit/?id=" + this.Get("ID") + "&status=" + status});
                        res.end();
                    });
                    break;
                case "delete":
                    status = 4;
                    category.Set("ID", params.id);
                    category.Delete(db, function(err){
                        if (err) {
                            status = 5;
                            console.log(err);
                        }
        
                        res.writeHead(302, {"Location":"/admin/categories/?status=" + status});
                        res.end();
                    });
                    break;
                default:
                    category.Filter(db, params, true, function(err, rawCategories){
                        if (err) {
                            console.log(err);
                        }

                        context["categories"] = rawCategories;
                        renderPage("./pages/admin/category.list.html", context);
                    });  
            }
        }
        
        function userHandler(action, activeUser) {
            let db = new DB(config.db.mysql),
                user = new User(),
                statusMessages = [
                    null,
                    {"type":"success","text":"User added successfully!"},
                    {"type":"success","text":"User updated successfully!"},
                    {"type":"danger","text":"Error saving user."},
                    {"type":"success","text":"User deleted successfully!"},
                    {"type":"danger","text":"Error deleting user."}
                ],
                context = {
                    "active_user": activeUser.Raw(),
                    "title": "User",
                    "message": statusMessages[(+params.status || 0)]
                },
                status = 0;

            ("id" in params) && (params.id = +params.id || 0);
            switch (action) {
                case "new":
                    renderPage("./pages/admin/user.form.html", context);
                    break;
                case "edit":
                    user.Set("ID", params.id);
                    user.Load(db, function(err){
                        if (err) {
                            console.log(err);
                        }
        
                        context["user"] = this.Raw();
                        renderPage("./pages/admin/user.form.html", context);
                    });
                    break;
                case "save":
                    status = 2;
                    user.Set("ID", params.id);
                    user.Set("LastName", params.last_name);
                    user.Set("FirstName", params.first_name);
                    user.Set("MiddleName", params.middle_name);
                    user.Set("Email", params.email);
                    user.Set("Username", params.username);
                    user.Set("IsAdmin", !!params.is_admin);
                    user.Set("IsActive", !!params.is_active);
                    if (user.Get("ID") === 0) {
                        status = 1;
                        user.Set("Password", params.password);
                        user.Set("CreatedBy", activeUser.Get("ID"));
                    }
                    user.Save(db, function(err){
                        if (err) {
                            status = 3;
                            console.log(err);
                        }
                        
                        res.writeHead(302, {"Location":"/admin/users/edit/?id=" + this.Get("ID") + "&status=" + status});
                        res.end();
                    });
                    break;
                case "delete":
                    status = 4;
                    user.Set("ID", params.id);
                    user.Delete(db, function(err){
                        if (err) {
                            status = 5;
                            console.log(err);
                        }
        
                        res.writeHead(302, {"Location":"/admin/users/?status=" + status});
                        res.end();
                    });
                    break;
                default:
                    user.Filter(db, params, true, function(err, rawUsers){
                        if (err) {
                            console.log(err);
                        }

                        context["users"] = rawUsers;
                        renderPage("./pages/admin/user.list.html", context);
                    });       
            }
        }
    }
    
    function renderPage(file, context, headers, code) {
        code = code || 200;
        headers = headers || {};
        headers["Content-Type"] = "text/html";
    
        fs.readFile(file, "utf-8", function(err,  content) {
            if (err) {
                console.log(err);
                res.end();
                return;
            }
    
            let template = handlebars.compile(content);
            res.writeHead(code, headers);
            res.write(template(context));
            res.end();
        });
    }

    function responseError(err, code) {
        let context = {},
            file = "./pages/template/error.html";
        switch (code) {
            case 404:
                context = {
                    "code": code,
                    "message": "Page not found."
                };
                break;
            case 413:
                context = {
                    "code": code,
                    "message": "Request Entity Too Large."
                };
                break;
            case 500:
                context = {
                    "code": code,
                    "message": "Internal Server Error."
                };
                break;
        }
        console.log("[" + code + "]: " + err);
        renderPage(file, context, null, code);
    }
}).listen(config.port, function(){
    console.log("server started @ localhost:%s", config.port);
});