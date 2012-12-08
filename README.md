7CRUD
================================
simple nodejs app that for backend maintain mysql database
current version note:
only support mysql
list create update delete

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
create table for test
````
	CREATE TABLE `MyTable` (
			`theId` int(11) NOT NULL,
			`name` varchar(45) NOT NULL,
			`title` varchar(45) DEFAULT NULL,
			`content` text,
			`date` datetime NOT NULL,
			PRIMARY KEY (`theId`)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8
````

add below code in you app.js
````
var crud = require("7crud");
crud.conf("db", "root", "pass");
crud.init(app);
````
nav http://localhost:3000/crud for start crud

example
--------------------
please create table first
````
cd example
node app.js
````
