$(document).ready(function() {
	//get all table and implement it to object
	$("table").each(function() {
		var impl = $(this).attr("tt.impl");
		if (impl) {
			var ins = eval("new " + impl + "($(this))");	
			$(this).attr("tt.ins", ins);
		}
	});
	$("input").each(function() {
		var impl = $(this).attr("tt.impl");
		if (impl) {
			eval("$(this)." + impl + "()");
		}
	});
});



//save the form with ajax please call it from a button inside the form tag
function crudSave(e) {
	var f = $(e.target).closest('form');
	if (!f) 
		return;
	$.post(f.attr('action'), f.toJSON(), function(res) {
		document.location = f.attr('redirect');	
	});
}

function crudDel(e) {
	if (!confirm('are you sure want to delete the object?')) 
		return;
	var f = $(e.target).closest('form');
	if (!f)
		return;
	var dId = f.find('[name="id"]');
	dId.attr("value", "@" + dId.attr("value"));
	$.post(f.attr('action'), f.toJSON(), function(res) {
		document.location = f.attr('redirect');	
	});
}

function crudLogin(e) {
	var f = $(e.target).closest('form');
	if (!f)
		return;
	
	$.post(f.attr('action'), f.toJSON(), function(res) {
		if (res==1) {
			document.location = f.attr('redirect');
		}
	});
}

//add outerHTML to obj
(function ($) {
    'use strict';
    var ns = 'outerHTML';
    if (!$.fn[ns]) {
        $.fn[ns] = function outerHTML(replacement) {
            var $this = $(this),
                content;
            if (replacement) {
                content = $this.replaceWith(replacement);
            } else {
                content = $this.wrap('<div>').parent().html();
                $this.unwrap();
            }
            return content;
        };
    }
}(jQuery));


(function($) {
$.fn.toJSON = function() {

   var o = {};
   var a = this.serializeArray();
   $.each(a, function() {
       if (o[this.name]) {
           if (!o[this.name].push) {
               o[this.name] = [o[this.name]];
           }
           o[this.name].push(this.value || '');
       } else {
           o[this.name] = this.value || '';
       }
   });
   return o;
};
})(jQuery);


/**
 * @author:TANTOM Simple Table Lister for 7crud
 */
function Lister(tb) {
    var _tb = tb;
    var _url = _tb.attr("tt.url");
    var _bd = _tb.find("tbody");
	var _ct = _bd.html();
    var _ju = _tb.find("tfoot tr td:last");

    this.load = load;
	var _tokens = [];
	var regex = /\$\{([^\}]+)\}/g,pos = 0,tmp,match;
   
	while (match = regex.exec(_ct, pos)) {
		tmp = _ct.substring(pos, match.index);
		_tokens.push(tmp);
		_tokens.push({"name":match[1]});
		pos = match.index + (match[0].length || 1);
	}
    tmp = _ct.substring(pos);
	_tokens.push(tmp);
	setTimeout(load, 10);
    function load() {
        var currentPage = _tb.attr("tt.current") || 0;
        var u = _url + "/" + currentPage;
        $.ajax({
            type: "get",
            url: u,
            dataType:'json',
            success:function(response) {
				build(response);
            },
            error:function (xhr) {
                alert(xhr.responseText);
            }
        });
    };

    function build(data) {
        _bd.html("");

		var rows = data.rows;
        var rowString = [];
        var t,dataObj;
		for (var i=0; i<rows.length; i++) {
			dataObj = rows[i];
			var sb = [];
			for (var j=0; j<_tokens.length; j++) {
				t = _tokens[j];
				if (typeof(t)=="string") {
					sb.push(t);	
				}else {
					sb.push(dataObj[t["name"]]);	
				}
			}
			rowString.push(sb.join(""));
		}
		
        _bd.append(rowString.join(""))
       


        var pRows = data.totalrows;
        var pCurrent = data.currentpage;
        var pTotalPage = data.totalpages;
        var pPerPage = data.perpage;

        _tb.attr("tt.rows", pRows);
        _tb.attr("tt.current", pCurrent);
        _tb.attr("tt.perpage", pPerPage);
        _tb.attr("tt.totalpage", pTotalPage);


        var lt = [];

        if (pTotalPage != 0) {
            lt.push("page:<span style='color:red'> ");
            lt.push(pCurrent * 1 + 1);
            lt.push(" </span>");
            lt.push(" total:<span style='color:red'> ");
            lt.push(pTotalPage);
            lt.push("</span>  ");
        }

        lt.push(" records <span style='color:red'>" + pRows + "</span>  ");

        if (pCurrent >= 1) {
            lt.push(" <a href=#### tt.type=First style='cursor:hand'>first</a>");
        }

        if (pCurrent > 0) {
            lt.push(" <a href=#### tt.type=Previous style='cursor:hand'>prev</a>");
        }

        if (pCurrent < pTotalPage - 1) {
            lt.push(" <a href=#### tt.type=Next style='cursor:hand'>next</a>");
        }

        if (pTotalPage > 1 && pCurrent != pTotalPage - 1) {
            lt.push(" <a href=#### tt.type=Last style='cursor:hand' id='lastPage'>last</a>");
        }

        if (pTotalPage > 1) {
            lt.push(" <span>jump<input type=text class=ip_text style='width:30px;text-align:center' tt.total.page=" + pTotalPage + ">page <a href=#### tt.type=Jump>GO</a></span>");
        }


        _ju.html(lt.join(""));


        var dls = _ju.find("A");
        dls.each(function(idx) {
            $(this).click(function(evt) {
                var type = $(this).attr("tt.type");
                if (type == null)
                    return;

                var currentPage = _tb.attr("tt.current") || 0;

                var targetPage = null;

                switch (type) {
                    case "First":
                        targetPage = 0;
                        break;
                    case "Last":
                        targetPage = _tb.attr("tt.totalpage") * 1 - 1;
                        break;
                    case "Previous":
                        targetPage = currentPage * 1 - 1;
                        break;
                    case "Next":
                        targetPage = currentPage * 1 + 1;
                        break;
                    case "Jump":
                        var domIp = $(this).parent().find("INPUT");
                        var m = domIp.attr("tt.total.page") * 1;
                        var v = domIp.val() * 1;
                        if (v <= 0 || v > m) {
                            alert("page not exist!");
                            return;
                        }
                        targetPage = v - 1;
                        break;
                }
                _tb.attr("tt.current", targetPage);
                load();
            });
        })

        _ju.find("INPUT").keydown(function(evt) {
            if (evt.keyCode == 13) {
                $(this).parent().find("A:last").click();
            }
        })

        var trs = _bd.find("TR");
        trs.each(function(i){
            $(this).hover(function(){
                 $(this).toggleClass("tro");
            })
            if (i%2==0) {
                $(this).addClass("trodd");
            }
			$(this).click(function(e) {
				var d = $(e.target).closest('tr');
				var links = d.find("a");
				if (links.length>0) {
					d.removeClass("tro");
					links[0].click();
				}
			});
        })
    }

    function scriptReplacer($scriptCode) {
        var idx = $scriptCode.indexOf("[SCRIPT]");
        if (idx == -1) { //do not has script
            return $scriptCode;
        }
        var tmp = [];
        var startIdx = 0;
        var endIdx = 0;
        var scriptStr = null;
        while (idx != -1) {
            tmp.push($scriptCode.substring(startIdx, idx));
            endIdx = $scriptCode.indexOf("[\/SCRIPT]", idx + 8);
            scriptStr = $scriptCode.substring(idx + 8, endIdx);
            tmp.push(eval(scriptStr));
            idx = $scriptCode.indexOf("[SCRIPT]", endIdx);
            startIdx = endIdx + 9;
        }
        tmp.push($scriptCode.substr(endIdx + 9));
        return tmp.join("");
    }
}