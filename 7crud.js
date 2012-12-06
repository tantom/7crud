var Sequelize = require("sequelize");
var crud = {};
var _tables = [];
var sequelize;
var moment = require("moment");
var fs = require("fs");
var ejs = require("ejs");
var async = require("async");
var sys = require("sys");
var viewHtml = fs.readFileSync(__dirname + '/pub/main.ejs', 'utf8');

//将简化定义的字段换成sequelize的字段类型
function getSeqColumnType(c) {
	if (c=="s") {
		return Sequelize.STRING;
	}else if (c=="d") {
		return Sequelize.DATE;
	}else if (c=="t") {
		return Sequelize.TEXT;
	}else if (c=="i") {
		return Sequelize.INTEGER;
	}
	return Sequelize.STRING;
}

function save(req, res) {		
	var et = _tables[req.params.name];
    for (var i in req.body) {
		if (req.body[i]=="") {
			req.body[i] = null;
		}
	}
	
	console.log('bodys:' + JSON.stringify(req.body));
	//带有id属性以更新的方式进行
	if (req.body.id) {
		//id 以@开头的话,表示进行删除操作
		if (req.body.id.indexOf("@")==0) {
			var etId = req.body.id.substring(1);
			console.log('etId:' + etId);
			et.seqObj.find(etId).success(function(data) {
				data.destroy().success(function() {
					res.end('{}');
				});
			});
		}else {
			et.seqObj.find(req.body.id).success(function(data) {
				data.updateAttributes(req.body).success(function() {
					res.end('{}');
				});
			});
		}
	}else {
		et.seqObj.create(req.body).success(function(task) {
			res.end('{}');
		});
	}
};

function add(req, res) {
	var etName = req.params.name;
	var et = _tables[etName];
	var sb = [];

	sb.push('<form  action="/crud/' + etName + '/save" redirect="/crud/' + etName + '/list">');
	sb.push('<table width=100%>');

	for (var i=0; i<et.cols.length; i++) {
		var col = et.cols[i];
		sb.push('<tr><td>');
		sb.push(col.name);
		sb.push('</td><td>');
		var val = "";
		if (col.type=="s" || col.type=="i") {
			sb.push("<input type=text name=" + col.name + " value=\"" + val  + "\" >");
		}else if (col.type=="t") {
			sb.push("<textarea style='width:100%;height:100px' name=" + col.name + ">" + val  + "</textarea>")
		}else if (col.type=="d") {
			sb.push('<input type=text name=' + col.name + ' value="' + val + '" tt.impl=jdPicker>');
		}
		sb.push('</td></tr>');
	}
	sb.push("<tr><td colspan=2 align=center>");
	sb.push("<input type=button onclick=crudSave(event) value=\"add new\">");
	sb.push("</td></tr>");
	sb.push('</table>');
	sb.push("</form>");

	res.send(renderViewHtml(sb.join(""), "<a href='javascript:history.go(-1)'>back</a>"));
	res.end();
};

function edit(req, res) {
	var etName = req.params.name;
	var et = _tables[etName];
    et.seqObj.find(req.params.id).success(function(data) {
		res.send(renderViewHtml(render(data),"<a href='javascript:history.go(-1)'>back</a>"));
		res.end();
	});

	function render(data) {
		//这里的表单是一个动态生成的表单
		var sb = [];
		sb.push('<form  action="/crud/' + etName + '/save" redirect="/crud/' + etName + '/list">');
		sb.push('<table width=100%>');
		
		sb.push('<input type=hidden name=id value=' + req.params.id + '>');
		for (var i=0; i<et.cols.length; i++) {
			var col = et.cols[i];
			sb.push('<tr><td>');
			sb.push(col.name);
			sb.push('</td><td>');
			var val = data[col.name];
			val = val==null?"":val;
			if (col.type=="s" || col.type=="i") {
				sb.push("<input type=text name=" + col.name + " value=\"" + val  + "\" >");
			}else if (col.type=="t") {
				sb.push("<textarea style='width:100%;height:100px' name=" + col.name + ">" + val  + "</textarea>")
			}else if (col.type=="d") {
			    val = data["get" + col.name]();	
				sb.push('<input type=text name=' + col.name + ' value="' + val + '" tt.impl=jdPicker>');
			}
			sb.push('</td></tr>');
		}
		sb.push("<tr><td colspan=2 align=center>");
		sb.push("<input type=button onclick=crudSave(event) value=update>");
		sb.push("<input type=button onclick=crudDel(event) value=delete>");
		sb.push("</td></tr>");
		sb.push('</table>');
		sb.push("</form>");
		return sb.join("");
	}
};

function listAll(req, res) {
    if (req.cookies.admin!='junzi') {
		res.redirect('/crud/login');
		return;
	}
	var sb = [];
	sb.push("<ul>");
	for (var i in _tables) {
		var et = _tables[i];
		sb.push('<li><a href=/crud/' + i + '/list >' + i + '</a></li>');
	}
	sb.push("</ul>");
	res.send(renderViewHtml(sb.join(""), ""));
	res.end();
}

function list(req, res) {
    var en = req.params.name;
	var et = _tables[en];
	var sb = [];
	var pageNav = '<a href="/crud/' + en + '/add">add new record</a>';
	sb.push('<table width=100%  tt.impl=Lister tt.url="/crud/' + en  + '/list/json" >');
	sb.push('<thead><tr>');
	// loop the define to list the columns
	et.listCols.forEach(function(col) {
		sb.push('<td>' + col + '</td>');	
	});
	sb.push('</tr></thead>');
	sb.push('<tbody><tr>');
	et.listCols.forEach(function(col, idx) {
		if (idx==0) {
			sb.push('<td><a href="/crud/' + en + '/edit/${id}">${' + col + '}</a></td>'); 
		}else {
			sb.push('<td>${' + col + '}</td>');
		}
	});

	sb.push('</tr></tbody>');
	sb.push('<tfoot><tr><td align=right colspan=' + et.listCols.length + '></td></tr></tfoot>');
	sb.push('</table>');
	res.send(renderViewHtml(sb.join(""), pageNav));
	res.end();
};


function listJson(req, res) {
	var et = _tables[req.params.name];
	var reqPage = req.params.page;
	
	if (!reqPage) {
		reqPage = 0;
	}
	var perPage = 10;

	var condi = {};
	var data = {};
	et.seqObj.count(condi).success(function(c) {
		data.totalrows = c;
		data.totalpages = Math.ceil(c/perPage);
		data.currentpage = reqPage;
		data.perpage = perPage;
		condi.limit = perPage;
		condi.offset = reqPage*perPage;
		//only list the need columns to the view
		condi.attributes = et.listCols.slice();
		if (condi.attributes.indexOf("id")==-1) {
			condi.attributes.push("id");
		}
		condi.order = "";
		et.seqObj.findAll(condi).success(function(mds) { 
			data.rows = mds;
			// console.log("get datas:\n" + JSON.stringify(data));
			res.send(data);
			res.end();
		}).error(function(error) {
			console.log("error");
			res.end();	
		})
	}).error(function(error) {
		res.end();
	});
};

function login(req, res) {
    var sb = [];
	sb.push('<form action=/crud/login redirect=/crud/list>');
	sb.push('<input type=text name=adminPass value="">');
	sb.push('<input type=button value=login onclick="crudLogin(event)">');
	sb.push('</form>');
	res.send(renderViewHtml(sb.join("")));
	res.end();
}

function doLogin(req, res) {
    console.log('cookies' + JSON.stringify(req.cookies));
	if (req.body['adminPass']==null) {
		res.end();
		return;
	}
		
	
	if (req.body['adminPass']!=crud.config.pass) {
		res.end();
	}else {
	    //set the admin login check token
		res.cookie("admin", "junzi", { expires: 0, httpOnly: true });
		res.end("1");
	}
}

crud.conf = function(db, user, pass) {	
	crud.config = {
		db:db,
		user:user,
		pass:pass
	}
    sequelize = new Sequelize(db, user, pass);
}

crud.init = function(app, tables) {
	var tbs = {};
	async.series([scanTables, buildTables, initServlets], function(err){
		if (err) {
			throw "can't not init with error:" + err;	
		}
	});

	function scanTables(callback) {
		var mysql      = require('mysql');
		var conn = mysql.createConnection({
			database : crud.config.db,
			user     : crud.config.user,
			password : crud.config.pass
		});

		conn.connect(function(err) {
			conn.query('show tables', function(err, rows, fields) {
				var colName = fields[0].name;
				//get all tables
				for (var i=0; i < rows.length; i++) {
					var row = rows[i];
					tbs[row[colName]] = {};
				}

				var q = async.queue(function(tableName, callback) {
					conn.query('show columns from ' + tableName, function(err, rows, fields) {
						// console.log(sys.inspect(rows));
						var sb = [];
						for (var i=0; i < rows.length; i++) {
							var row = rows[i];
							var s = row.Field + "/";
							if (row.Type.indexOf('int')==0 || 
								row.Type.indexOf('tinyint')==0) {
								s += "i";
							}else if (row.Type.indexOf('varchar')==0) {
								s += "s";
							}else if (row.Type.indexOf('text')==0) {
								s += "t";
							}else if (row.Type.indexOf('date')==0) {
								s += "d";
							}else { //otherwise use as string 
								s += "s";
							}
							sb.push(s);
						}
						tbs[tableName].columns = sb.join(" ");
						console.log('tb columns:' + tbs[tableName].columns);
						callback();
					});
				}, 3);
			
				//get all table columns
				for (var i in tbs) {
					q.push(i);
				}

				q.drain = function() {
					console.log('ok, call next ');
					//remap tables, if user has define the same table use user define
					for (var i in tables) {
						tbs[i] = tables[i];
					}
					tables = tbs;

					conn.end();
					callback();
				}

			});	
		});
	}

	function buildTables(callback) {
		//将模型转换为sequelize的数据模型
		for (var i in tables) {
			var et = tables[i];
			et.table = i;
			et.cols = [];
			et.listCols = [];
			//根据字段的定义生成sequelize的数据模型
			var seq = {}, cl, df;
			var cls = et.columns.split(" ");
			var insM = {};
			insM.instanceMethods = {};
			for (var j=0; j<cls.length; j++) {
				cl = cls[j];
				df = cl.split("/");
				var column = {
					name:df[0],
					type:df[1]
				}
				et.cols.push(column);
				et.listCols.push(column.name);
				seq[column.name] = getSeqColumnType(column.type);

				if (column.type=="d") {
					var methodName = "get" + column.name;
					var dateCol = column.name;
					insM.instanceMethods[methodName] = function() {
						var d = this[dateCol];
						if (d==null)
							return "";
						return moment(d).format("YYYY/MM/DD");
					}
				}
			}
			if (et.list!=null) {
				var listCs = et.list.split(" ");
				et.listCols = listCs;
			}
			//not insert time 
			insM.timestamps = false;
			insM.freezeTableName = true;
            console.log('tb:' + et.table);
			et.seqObj = sequelize.define(et.table, seq, insM);
			_tables[i] = et;
		}
		console.log('buildTables complete');
		callback();
	}

	function initServlets(callback) {
		app.post('/crud/:name/save', save);
		app.get('/crud/list', listAll);
		app.get('/crud/:name/add', add);
		app.get('/crud/:name/list/json/:page', listJson);
		app.get('/crud/:name/list', list);
		app.get('/crud/:name/edit/:id', edit);
		app.get('/crud/login', login);
		app.post('/crud/login', doLogin);
		app.get('/crud-pub/:file', pubFile);
		console.log('init servlets complete');
		callback();
	}
}

function pubFile(req, res) {
	var str = fs.readFileSync(__dirname + "/pub/" + req.params.file);
	res.send(str);
	res.end();
}

function renderViewHtml(str, pageNav) {
	console.log('pageNav:' + pageNav);
	return ejs.render(viewHtml, {
		insideHtml:str,
		pageNav:pageNav,
		filename:__dirname + '/pub/main.ejs'
	});
}

module.exports = crud; 

