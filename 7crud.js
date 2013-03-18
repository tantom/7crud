var Sequelize = require("sequelize");
var maintainTbName = "7crud";
var crud = {};
var _tables = [];
var sequelize;
var moment = require("moment");
var fs = require("fs");
var ejs = require("ejs");
var async = require("async");
var sys = require("sys");
var _ = require("underscore");
var viewHtml = fs.readFileSync(__dirname + '/pub/main.ejs', 'utf8');

function getSeqColumnType(c) {
    var t = {};
    
	if (c.type=="s" || c.type=="bs") {
		t.type = Sequelize.STRING;
	}else if (c.type=="d" || c.type=="dt") {
		t.type = Sequelize.DATE;
	}else if (c.type=="t") {
	    t.type = Sequelize.TEXT;
	}else if (c.type=="i") {
		t.type = Sequelize.INTEGER;
	}else if (c.type=="f") {
		t.type = Sequelize.FLOAT;
	}else {
		t.type = Sequelize.STRING;
	}

	if (c.hasExtra("p")) {
		t.primaryKey = true;
	}
	if (c.hasExtra("n")) {
		t.validate = {};
		t.validate.notNull = true;
	}

	return t;
}

function save(req, res, next) {		
	var et = _tables[req.params.name];
    for (var i in req.body) {
		if (req.body[i]=="") {
			req.body[i] = null;
		}
	}
	
	// console.log('bodys:' + JSON.stringify(req.body));
	if (req.body._id) {
		if (req.body._id.indexOf("@")==0) {
			var etId = req.body._id.substring(1);
			console.log('etId:' + etId);
			et.seqObj.find(etId).success(function(data) {
				data.destroy().success(function() {
					res.end('{}');
					console.log('et.key:' + et.key);
					console.log('mtname:' + maintainTbName);
					//if the table is maintain table delete the object
					if (et.key == maintainTbName) {
						_tables[etId] = null;
						delete _tables[etId];
					}
				});
			});
		}else {
			var simObj = et.seqObj.build(req.body);
			var errors = simObj.validate();
			if (errors) {
				next(new Error(_.values(errors)));
				return;
			}
			et.seqObj.find(req.body._id).success(function(data) {
				data.updateAttributes(req.body).success(function() {
					//update maintain table reference
					if (et.key == maintainTbName) {
						var modiEt = _tables[req.body._id];
						if (modiEt) {
							//@todo bug sequelize can't update primaryKey's value
							//so the web PRIMARY input now set to readonly
							modiEt.columns = req.body.def;
							modiEt.list = req.body.list;
							modiEt.key = req.body.name;
							modiEt.sort = req.body.sort;
							modiEt.wherePs = req.body.wherePs;
							modiEt.table = req.body.table || modiEt.key;
							modiEt._cols = _tables[modiEt.table]._cols;
							//delete src reference
							_tables[req.body._id] = null;
							delete _tables[req.body._id];
							buildTableObj(modiEt);
						}
					}
					res.end('{}');
				});
			});
		}

		
	}else {
		var simObj = et.seqObj.build(req.body);
		var errors = simObj.validate();
		if (errors) {
			next(new Error(_.values(errors)));
			return;
		}
		simObj.save().success(function(task) {
			if (et.key == maintainTbName) {
				var addEt = {};
				addEt.columns = req.body.def;
				addEt.list = req.body.list;
				addEt.key = req.body.name;
				addEt.sort = req.body.sort;
				addEt.table = req.body.table || addEt.key;

				var srcTable = _tables[addEt.table];
				if (srcTable) {
					addEt._cols = srcTable._cols;
					addEt._def = srcTable._def;
					buildTableObj(addEt);
				}
			}
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
		sb.push('<tr><td class=colName>');
		sb.push(col.name);
		if (col.hasExtra("n")) {
			sb.push(" <span class=notNull>*</span>");
		}
		sb.push('</td><td>');
		var val = "";
		var cls = "";
		if (col.hasExtra("n")) {
			cls = 'class="required"';
		}
		if (col.type=="s" || col.type=="i" || col.type=="f") {
		    var disableStr = col.hasExtra('a')?"disabled":"";
			sb.push("<input type=text name=" + col.name + " value=\"" + val  + "\" " + disableStr  + " " + cls  + " >");
		}else if (col.type=="t" || col.type=="bs") {
			var plusStyle = "";
			if (col.type=="t") {
				plusStyle = " style='height:500px' ";
			}
			sb.push("<textarea " + plusStyle  +" name=" + col.name + " " + cls + " >" + val  + "</textarea>")
		}else if (col.type=="d" || col.type=="dt") {
			var fm = "";
			if (col.type=="dt") {
				fm = "{format:'%Y-%m-%e %k:%i'}";
			}else {
				fm = "{format:'%Y-%m-%e'}";
			}
			sb.push('<input id=IP_' + col.name + '' + cls + ' type=text name=' + col.name + ' value="' + val + '" tt.impl="AnyTime_picker" tt.params="' + fm + '">');
		}
		sb.push('</td></tr>');
	}
	sb.push("<tr><td colspan=2 align=center>");
	sb.push("<input type=button onclick=crudSave(event) value=\"add new\">");
	sb.push("</td></tr>");
	sb.push("</table>");
	sb.push("</form>");
	
	//if it's maintain table add then add event to table
	if (et.key==maintainTbName) {
		sb.push("<script>");
		sb.push("var acTables = [");
		var tmp = [];
		for (var i in _tables) {
			var tb = _tables[i];
			if (tb._scan && tb.table!=maintainTbName) {
				tmp.push("{id:'" + tb.table + "',name:'" + tb.table + "'}");
			}
		}
		sb.push(tmp.join(","));

		sb.push("];");
		sb.push("</script>");
		sb.push("<script>addManTableEvts()</script>");
	}

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
		var sb = [];
		var cls = "";
		sb.push('<script>');
		sb.push('var submitCMS=[];');
		sb.push('</script>');
		sb.push('<form  action="/crud/' + etName + '/save" redirect="/crud/' + etName + '/list">');
		sb.push('<table width=100%>');
		sb.push('<input type=hidden name=_id value=' + req.params.id + '>');
		for (var i=0; i<et.cols.length; i++) {
			var col = et.cols[i];
			var bEditor = false;
			sb.push('<tr><td class=colName>');
			sb.push(col.name);
            if (col.name.indexOf("script")!=-1) {
				bEditor = true;
			}
			if (col.hasExtra("n")) {
				sb.push(" <span class=notNull>*</span>");
			}

			sb.push('</td><td>');
			var val = data[col.name];
			val = val==null?"":val;

			var cls = "";
			if (col.hasExtra("n")) {
				cls = 'class="required"';
			}

			if (col.type=="s" || col.type=="i" || col.type=="f") {
				var disableStr = col.hasExtra("a")||col.hasExtra("p")?"readonly":"";

				sb.push("<input type=text name=" + col.name + " value=\"" + val  + "\" " + disableStr + " " + cls + ">");
			}else if (col.type=="t" || col.type=="bs") {
				var plusStyle = "";
				if (col.type=="t") {
					plusStyle = " style='height:500px' ";
				}
				
				sb.push("<textarea " + plusStyle  + "" + cls  + " name=" + col.name + " id=ID"+ col.name  +">" + val  + "</textarea>");
					
			}else if (col.type=="d" || col.type=="dt") {
				var fm = "";
				if (col.type=="dt") {
					if (val) {
						val = moment(val).format("YYYY-MM-DD HH:mm");
					}else {
						val = "";
					}
					fm = "{format:'%Y-%m-%e %k:%i'}";
				}else {
					if (val) {
						val = moment(val).format("YYYY-MM-DD");
					}else {
						val = "";
					}
					fm = "{format:'%Y-%m-%e'}";
				}
				sb.push('<input id=IP_' + col.name + '' + cls + ' type=text name=' + col.name + ' value="' + val + '" tt.impl="AnyTime_picker" tt.params="' + fm + '">');
			}

			if (bEditor) {
				sb.push('<script>');
				sb.push('function reformat' + col.name + '(){\n');
				// sb.push('alert("do")');
				sb.push('CodeMirror.commands["selectAll"](cm' + col.name  + ');');
				sb.push('var r={ from: cm' +col.name + '.getCursor(true), to: cm' + col.name + '.getCursor(false) };\n');
				sb.push('cm' + col.name + '.autoFormatRange(r.from, r.to);\n');
				sb.push('}\n');
				sb.push('var foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder);');
				sb.push('var cm' + col.name  + ' = CodeMirror.fromTextArea(document.getElementById("ID' + col.name  + '"), { styleActiveLine: true,lineNumbers: true,lineWrapping: true,mode: "application/json",gutters: ["CodeMirror-lint-markers"],lintWith: CodeMirror.jsonValidator,indentUnit:2, tabSize:2, smartIndent:true, dragDrop:false,autoCloseBrackets:true,indentWithTabs: false, extraKeys: {"Ctrl-I": reformat' + col.name  + '}});');	
				sb.push('submitCMS.push(cm'+col.name+');');
				sb.push('cm' + col.name + '.on("gutterClick", foldFunc);');
				sb.push('</script>');
			}
			sb.push('</td></tr>');
		}
		sb.push("<tr><td colspan=2 align=center>");
		sb.push("<input type=button onclick=crudSave(event) value=update>");
		sb.push("<input type=button onclick=crudDel(event) value=delete>");
		sb.push("</td></tr>");
		sb.push('</table>');
		sb.push("</form>");


		//if it's maintain table add then add event to table
		if (et.key==maintainTbName) {
			sb.push("<script>");
			sb.push("var acTables = [");
			var tmp = [];
				for (var i in _tables) {
					var tb = _tables[i];
					if (tb._scan && tb.table!=maintainTbName) {
						tmp.push("{id:'" + tb.table + "',name:'" + tb.table + "'}");
					}
				}
				sb.push(tmp.join(","));

				sb.push("];");
				sb.push("</script>");
				sb.push("<script>addManTableEvts()</script>");
		}

		return sb.join("");
	}
};

function index(req, res) {
    if (req.cookies.admin!=crud.config.passMD5) {
		res.redirect('/crud/login');
		return;
	}
	var sb = [];
	sb.push("<ul>");
	for (var i in _tables) {
		var et = _tables[i];
		var cls = "";
		if (i==maintainTbName) 
			cls = "class=tMTable";
		var icon = "table.png";
		if (!et._scan) 
			icon = "mask.png";
		sb.push('<li><img src=/crud-pub/' + icon + ' border=0 align=abstop> <a href=/crud/' + i + '/list ' + cls + '>' + i + '</a> <span class=columnDef>' + et.columns  + '</span>');
		if (!et._scan) {
			sb.push(' [' + et.table + ']');
		}
		if (et.table!=maintainTbName) {
			var path = "/json/list/" + i;
			sb.push(" <a href='" + path  + "' title='" + path + "' >");
			sb.push("<img src=/crud-pub/link.png border=0 title='" + path + "'>");
			sb.push("</a>");
		}

		sb.push('</li>');
	}
	sb.push("</ul>");
	res.send(renderViewHtml(sb.join(""), ""));
	res.end();
}

function list(req, res) {
    var en = req.params.name;
	var et = _tables[en];
	var sb = [];
	var pageNav ='<span style="font-weight:bold">[' + en + ']</span> <a href="/crud/' + en + '/add">add new record</a><a href="/crud/' + en + '/def" style="float:right">def</a>';
	sb.push('<table width=100%  tt.impl=Lister tt.url="/json/list/' + en  + '" id=Lister>');
	sb.push('<thead><tr>');
	// loop the define to list the columns
	et.listCols.forEach(function(col) {
		sb.push('<td>' + col + '</td>');	
	});
	sb.push('</tr></thead>');
	sb.push('<tbody><tr>');
	et.listCols.forEach(function(col, idx) {
		if (idx==0) {
			sb.push('<td><a href="/crud/' + en + '/edit/${' + et.pk + '}">${' + col + '}</a><a href="/json/get/'+en+'/${' + et.pk  +'}"><img src=/crud-pub/link.png border=0 align=absbottom></a></td>'); 
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

function getJson(req, res) {
	var et = _tables[req.params.name];
	et.seqObj.find(req.params.id).success(function(data) {
		res.send(data);
		res.end();
	}).error(function(error) {
		console.log("error:" + error);
		res.end();	
	});
}
function isNumber (o) {
  return ! isNaN (o-0) && o !== null && o !== "" && o !== false;
}
//parse the query params params has join with & ex: 0&o-@aaa|@bbb&f-
function parseQueryPs(ps, et) {
	if (ps==null) {
		ps = "";
	}
	var tmp = ps.split('&');
	var query = {};
	tmp.forEach(function(p) {
		if (p.indexOf('o-')==0) { //order params
			p = p.substring(2);
			var tmp = [];
			if (p.length>0) {
				var orderCols = p.split("|");
				orderCols.forEach(function(o) {
					if (o.indexOf('@')==0) {
						tmp.push('`' + o.substring(1) + "` ");
					}else {
						tmp.push('`' + o + '` desc');
					}
				});
				query.orders = tmp.join(",");
			}
		}else if (p.indexOf('f-')==0) { //filter params
			p = p.substring(2);
			var filterArys = p.split("|");
			if (p.length>0) {
				var wherePs = [];
				filterArys.forEach(function(o) {
					var n = o.split("=");
					var c = n[0];
					var col = et._cols[c];
					if (col!=null && n.length>1) {
						if (col.type=='i' || col.type=='f') {
							wherePs.push("`" + c + "`=" + n[1]);
						}else {
							wherePs.push("`" + c + "`='" + n[1] + "'");
						}
					}
				});
				query.where = wherePs.join(" and ");
			}
		}else { //page params
			if (isNumber(p)) {
			   query.page = p*1;
			}else {
			   query.page = 0;
			}
		}
	});
	return query;
}

function listJson(req, res) {
	var et = _tables[req.params.name];
	var ps = req.params.ps;
	var query = parseQueryPs(ps, et);
	if (et.sort!=null) {
		if (query.orders!=null) {
			query.orders = query.orders + "," + et.sort;
		}else {
			query.orders = et.sort;
		}
	}
	if (et.wherePs!=null) {
		if (query.where!=null) {
			query.where = query.where + " and " + et.wherePs;
		}else {
			query.where = et.wherePs;
		}
	}
	
	var perPage = req.params.perPage;
	if (perPage==null) {
		perPage = 10;
	}
	
	var condi = {};
	if (query.where!=null) {
		condi.where = query.where;
	}
	var data = {};
	et.seqObj.count(condi).success(function(c) {
		data.totalrows = c;
		data.totalpages = Math.ceil(c/perPage);
		data.currentpage = query.page;
		data.perpage = perPage;
		condi.limit = perPage;
		condi.offset = query.page*perPage;
		//only list the need columns to the view
		condi.attributes = et.listCols.slice();
		//if not include the pk in the list then auto add it
		//cause lister need id to render the edit link
		if (!_.contains(condi.attributes, et.pk)) {
			condi.attributes.push(et.pk);
		}
		condi.order = query.orders;
		if (query.where!=null) {
			condi.where = query.where;
			// condi.where = {key:'qqnews'};
		}
		console.log('query:' + sys.inspect(query));
		console.log('condi:' + sys.inspect(condi));
		et.seqObj.findAll(condi).success(function(mds) { 
			data.rows = mds;
			//format rows date to viewable format, @todo support show time
			et.dateCols.forEach(function(dateCol) {
				data.rows.forEach(function(row) {
					var colVal = row[dateCol];
					if (colVal) {
						row[dateCol] = moment(colVal).format("YYYY-MM-DD");
					}
				});
			});
			
			et.timeCols.forEach(function(dateCol) {
				data.rows.forEach(function(row) {
					var colVal = row[dateCol];
					if (colVal) {
						row[dateCol] = moment(colVal).format("YYYY-MM-DD HH:mm");
					}
				});
			});
			//console.log("get datas:\n" + JSON.stringify(data));
			res.send(data);
			res.end();
		}).error(function(error) {
			console.log("error:" + error);
			res.end();	
		})
	}).error(function(error) {
		res.end();
	});
};

function logout(req, res) {
	res.clearCookie("admin");
	var sb = [];
	sb.push("<script>");
	sb.push('document.location="/crud"');
	sb.push("</script>");
	res.send(renderViewHtml(sb.join("")));
	res.end();
}

function md5(str){
	var hash = require('crypto').createHash('md5');
	return hash.update(str).digest('hex');
}

function login(req, res) {
    var sb = [];
	sb.push('<form onsubmit="crudLogin(event);return false;"  action=/crud/login redirect=/crud method=post>');
	sb.push('<input type=password name=adminPass value="">');
	sb.push('<input type=hidden name=adminPassTrue value="">');
	sb.push('<input type=button value=login onclick="crudLogin(event)">');
	sb.push('</form>');
	res.send(renderViewHtml(sb.join("")));
	res.end();
}

function doLogin(req, res) {
    // console.log('cookies' + JSON.stringify(req.cookies));
	if (req.body['adminPass']==null || req.body['adminPassTrue']==null) {
		res.end();
		return;
	}
		
	var userInput = req.body['adminPassTrue'];
	var wantedPs = md5(md5(crud.config.pass));
	if (wantedPs!=userInput) {
		res.end();
	}else {
	    //set the admin login check token
		res.cookie("admin", wantedPs, { expires: 0, httpOnly: true });
		res.end('1');
	}
}

function command(req, res) {
	if (req.params.cmd=="table") {
		var tb = _tables[req.params.p];
		if (!tb) {
			res.end("{}");
		}else {
			res.end('{"columns":"' + tb._columns + '"}');
		}

		return;
	}
	res.end("");
}

crud.tables = function() {
	return _tables;
}

crud.table = function(tbName) {
	return _tables[tbName];
}

crud.conf = function(db, user, pass) {	
	crud.config = {
		db:db,
		user:user,
		pass:pass,
		passMD5:md5(md5(pass))
	}

    sequelize = new Sequelize(db, user, pass);
}

crud.init = function(app, tables) {
	var tbs = {};
	if (tables==null)
		tables = [];

	async.series([scanTables, buildTables, initServlets], function(err){
		if (err) {
			throw "7crud: can't not init with error:" + err;	
		}else { 
			console.log('7crud: init success for tables:' + _.keys(_tables));
			console.log('7crud: visit http://localhost:port/crud');
		}
	});

	function scanTables(callback) {
		var mysql      = require('mysql');
		var conn = mysql.createConnection({
			database : crud.config.db,
			user     : crud.config.user,
			password : crud.config.pass
		});
	    //tag for check is it has the maintain table crud7
		var bHasMTTable = false; //if not auto create it
		conn.connect(function(err) {
			if (err) {
				console.log(err);
			}
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
						var cols = [];
						var colsMap = {};
						for (var i=0; i < rows.length; i++) {
							var row = rows[i];
							cols.push(row.Field);
							// console.log('row:' + sys.inspect(row));
							var s = row.Field + "/";
							if (row.Type.indexOf('int')==0 || 
								row.Type.indexOf('tinyint')==0) {
								s += "i";
							}else if (row.Type.indexOf('varchar')==0) {
								//if string length more than 100 set to big string 
								if (row.Type.length>11) {
									s += "bs";
								}else {
									s += "s";
								}
							}else if (row.Type.indexOf('text')==0) {
								s += "t";
							}else if (row.Type.indexOf('date')==0) {
								if (row.Type.indexOf('datetime')==0) {
									s += "dt";
								}else {
									s += "d";
								}
							}else if (row.Type.indexOf('float')==0) {
								s += "f";
							}else { //otherwise use as string 
								s += "s";
							}

							//if has extra like auto_increment that it can't edit
							if (row.Extra.indexOf('auto_increment')==0) {
								s += "/a";
							}
							if (row.Key.indexOf('PRI')==0) {
								s += "/p";
							}
							if (row.Null.indexOf('NO')==0) {
								s += "/n";
							}

							sb.push(s);
							colsMap[row.Field] = s; 
						}
						tbs[tableName].columns = cols.join(",");
						tbs[tableName]._columns = cols.join(",");
						tbs[tableName].table = tableName;
						tbs[tableName].key = tableName;
						tbs[tableName]._def = sb.join(",");
						tbs[tableName]._cols = colsMap;
						tbs[tableName]._scan = true; //mark as scaned tables
						callback();
					});
				}, 3);
			
				//get all table columns
				for (var i in tbs) {
					q.push(i);
					if (i==maintainTbName) {
						bHasMTTable = true;
					}
				}

				q.drain = function() {
					//remap tables, if user has define the same table use user define
					for (var i in tables) {
						var autoDefTable = tbs[i];
						tbs[i] = tables[i];
						if (!tbs[i].table)
							tbs[i].table = i;
						if (!tbs[i].key) 
							tbs[i].key = i;
					}
					tables = tbs;
					
					//build the maintain table
					if (!bHasMTTable) {
						conn.query("CREATE  TABLE `" + maintainTbName + "` (" + 
						"`name` VARCHAR(50) NOT NULL ," + 
						"`desc` VARCHAR(2000) NULL , " + 
						"`table` VARCHAR(50) NULL , " + 
						"`def` VARCHAR(2000) NOT NULL ," + 
						"`list` VARCHAR(2000) NULL ," + 
						"`sort` VARCHAR(2000) NULL ," +
						"`wherePs` VARCHAR(2000) NULL ," + 
						"PRIMARY KEY (`name`) )", function(err, rows, fields){
							console.log('auto create maintain table [' + maintainTbName  + ']');
							var tbMT = {};
							var colsMap = {};
							colsMap.name = "name/s/p/n";
							colsMap.table = "table/s";
							colsMap.desc = "desc/bs";
							colsMap.def = "def/bs/n";
							colsMap.list = "list/bs";
							colsMap.sort = "sort/bs";
                            colsMap.wherePs = "wherePs/bs";
							tbMT._cols = colsMap;
							tbMT._def =  "name,table,desc,def,list,sort,wherePs";
							tbMT.key = maintainTbName;
							tbMT.table = maintainTbName;
							tbMT.columns = "name,table,desc,def,list,sort,wherePs";
							tbMT._scan = true;
							tables[maintainTbName] = tbMT;
							conn.end();
							callback();
						});
					}else {
						//update db obj model with def 
						conn.query("select * from `" + maintainTbName + "`", function(err, rows, fields){
							rows.forEach(function(row) {
								var reDef = tables[row.name];
								if (reDef) {
									reDef.columns = row.def;
									reDef.list = row.list;
									reDef.sort = row.sort;
									reDef.wherePs = row.wherePs;
								}else {
									//not exist table remap the table, it's a mask
									var newDef = {};
									newDef.columns = row.def;
									newDef.list = row.list;
									newDef.table = row.table;
									newDef.key = row.name;
									newDef.sort = row.sort;
                                    newDef.wherePs = row.wherePs; 
									var srcTable = tables[newDef.table]; 
									if (srcTable) {
										newDef._def = srcTable._def;
										newDef._cols = srcTable._cols;
										newDef._columns = srcTable._columns;
										tables[row.name] = newDef;
									}
									//@todo table droped delete def config
								}
							});		

							conn.end();
							callback();
						}); //end query from maintain table 
					}
				}

			});	
		});
	}

	function buildTables(callback) {
		for (var i in tables) {
			var et = tables[i];
			buildTableObj(et);
		}

		console.log('tbs:\n' + sys.inspect(tables));
		callback();
	}

	function initServlets(callback) {
		app.get('/crud/:name/def', def);
		app.post('/crud/:name/def/save', defSave);
		app.post('/crud/:name/save', save);
		app.get('/crud', index);
		app.get('/crud/:name/add', add);
		// app.get('/crud/:name/list/json/:page/:params', listJson);
		app.get('/crud/:name/list', list);
		app.get('/crud/:name/edit/:id', edit);
		app.get('/crud/login', login);
		app.post('/crud/login', doLogin);
		app.get('/crud/logout', logout);
		app.get('/crud-pub/:file', pubFile);
		app.get('/crud-command/:cmd/:p', command);
		app.get('/json/list:perPage?/:name/:ps?', listJson);
		app.get('/json/get/:name/:id', getJson);
		callback();
	}
}



function buildTableObj(et) {
	et.cols = [];
	et.listCols = [];
	et.colsMap = {};
	et.dateCols = [];
	et.timeCols = [];
	var seq = {}, cl, df;
	var cls = et.columns.split(",");
	var insM = {};
	insM.instanceMethods = {};
	for (var j=0; j<cls.length; j++) {
		cl = cls[j];
		cl = et._cols[cl];
		df = cl.split("/");
		var column = {
			name:df[0],
			type:df[1]
		}
		if (df.length>2) {
			column.extra = _.rest(df, 2).join("");
		}else {
			column.extra = "";
		}
		column.hasExtra = function(ex) {
			return this.extra.indexOf(ex)!=-1;
		}

		if (column.hasExtra("p")) {
			et.pkColumn = column;
			et.pk = column.name;
		}
		et.colsMap[column.name] = column;
		et.cols.push(column);
		et.listCols.push(column.name);
		seq[column.name] = getSeqColumnType(column);

		if (column.type=="d") {
			et.dateCols.push(column.name);
		}
		if (column.type=="dt") {
			et.timeCols.push(column.name);
		}
	}
	if (et.list!=null) {
		var listCs = et.list.split(",");
		et.listCols = listCs;
	}
	//not use sequelize auto insert time 
	insM.timestamps = false;
	insM.freezeTableName = true;
	et.seqObj = sequelize.define(et.table, seq, insM);

	if (et.pk==null) {
		console.log("7crud: not support table [" + et.table  + "] that do not has an primaryKey");
		if (et._def!=null) {
			var srcCls = et._def.split(",");
			for (var i=0; i<srcCls.length; i++) {
				var cl = srcCls[i];
				if (cl.indexOf("/p")!=-1) {
					var df = cl.split("/");
					var column = {
						name:df[0],
						type:df[1]
					}

					column.extra = _.rest(df, 2).join("");
					et.pkColumn = column;
					et.pk = column.name;
					_tables[et.table] = et;
					break;
				}
			}
		}
	}else {
		_tables[et.key] = et;
	}
}

function defSave(req, res) {
	var et = _tables[req.params.name];
    for (var i in req.body) {
		if (req.body[i]=="") {
			req.body[i] = null;
		}
	}
	
	//if found update otherwise add def
	var mt = _tables[maintainTbName];
	mt.seqObj.find(req.params.name).success(function(data) {
	  if (!data) { //add 
		 data = {};
		 data.name = req.params.name;
		 data.def = req.body.def;
		 data.list = req.body.list;
		 data.sort = req.body.sort;
		 data.wherePs = req.body.wherePs;
		 mt.seqObj.build(data).save().success(function(obj) {
			//update memory db obj
			et.columns = data.def;
			et.list = data.list;
			et.sort = data.sort;
			et.wherePs = data.wherePs;
			buildTableObj(et);
		 	res.end('{}');
		 }).error(function(error){
			res.end();
		 });
	  }else { //update
		 data.list = req.body.list;
		 data.sort = req.body.sort;
		 data.wherePs = req.body.wherePs;
		 data.def = req.body.def;
		 data.updateAttributes(data).success(function(data) {
			//update memory db obj
			et.columns = data.def;
			et.wherePs = data.wherePs;
			et.list = data.list;
			et.sort = data.sort;
			buildTableObj(et);
		 	res.end('{}');
		 }).error(function(error) {
		 	res.end();
		 });
	  }
	});
}

function def(req, res) {
	var etName = req.params.name;
	var et = _tables[etName];
	var mt = _tables[maintainTbName];
	mt.seqObj.find(etName).success(function(data) {
		if (!data) {
			data = {};
			data.def = et.columns;
			data.list = _.values(et.listCols);
			data.sort = "";
			data.wherePs = "";
		}else {
			if (!data.def)
				data.def = "";
			if (!data.list)
				data.list = "";
			if (!data.sort)
				data.sort = "";
			if (!data.wherePs)
				data.wherePs = "";
		}

		var sb = [];
		sb.push('<form action="/crud/' + etName + '/def/save" redirect="/crud/' + etName + '/list">');
		sb.push('<table width=100%>');
		sb.push('<tr><td>table</td><td>' + et.table + '</td></tr>');
		sb.push('<tr><td>columns</td><td id=srcTableCols></td></tr>');
		sb.push('<tr><td>def</td><td><textarea name=def>' + data.def  +'</textarea></td></tr>');
		sb.push('<tr><td>list</td><td><textarea name=list>' + data.list  + '</textarea></td></tr>');
		sb.push('<tr><td>sort</td><td><textarea name=sort>' + data.sort + '</textarea></td></tr>');
		sb.push('<tr><td>wherePs</td><td><textarea name=wherePs>' + data.wherePs + '</textarea></td></tr>');
		sb.push("<tr><td colspan=2 align=center><input type=button onclick=crudDefSave(event) value='save def'></td></tr>");
		sb.push('</table>');
		sb.push('</form>');

		sb.push('<script>');
		sb.push('addManTableEvts("' + et.table + '");');
		sb.push('</script>');

		res.send(renderViewHtml(sb.join(""), "<a href='javascript:history.go(-1)'>back</a>"));
		res.end();
	}).error(function(error) {
		console.log('error:' + error);
	});
}

function pubFile(req, res) {
	fs.readFile(__dirname + "/pub/" + req.params.file, function (err, data) {
		if (err) throw err;
		res.send(data);
		res.end();
	});
}

function renderViewHtml(str, pageNav) {
	return ejs.render(viewHtml, {
		insideHtml:str,
		pageNav:pageNav,
		filename:__dirname + '/pub/main.ejs'
	});
}

module.exports = crud;



