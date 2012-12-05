7CRUD
================================
simple nodejs app that for backend maintain mysql database

install-manual
--------------
	cd youapp 
	cd node_modules 
	mkdir 7crud
	git clone https://github.com/tantom/7crud.git 

install-npm
-------------
	not publish yet~

use 
-------------
create table for test, struct like 
````
name:varchar
code:text
hash:varchar
updateTime:datetime
downCount:integer
desc:varchar
````

add below code in you app.js
````
var tables = {
	tbName:{
			columns:"name/s code/t hash/s updateTime/d downCount/i desc/s",
			list:"id name desc"
		}
}

var crud = require("7crud");
crud.conf("db", "root", "pass");
crud.init(app, tables);
````
nav http://localhost:3000/crud/list for start crud

