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
add below code the your app.js
````
var tables = {
	ETScripts:{
			columns:"name/s code/t hash/s updateTime/d downCount/i desc/s",
			list:"id name desc"
		}
}

var crud = require("7crud");
crud.conf("duolatu", "root", "db.exi");
crud.init(app, tables);
````

