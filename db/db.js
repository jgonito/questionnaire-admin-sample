const mysql = require("mysql");

function DB(config) {
    var _pool = mysql.createPool(config),
        _this = {
            "Select": _query,
            "Query": _query
        };
    
    function _query(sql, values, cb) {
        // ** NOTE: if 'values' is a function, it will be assumed as the callback (cb) **
        if (values instanceof Function) {
            cb = values;
        }

        _pool.getConnection(function(err, conn){
            if (err) {
                cb.call(_this, err);
                return;
            }

            conn.query(sql, values, function(err, result, fields){
                conn.release();
                cb.call(_this, err, result, fields);
            });
        });
    }

    return _this;
}

module.exports = DB;