
$("#searchLink").fadeOut();//

var root;
var margin = 50;
var width = $(window).width() - margin,
  height = $(window).height() - margin;
var strokewidth = 3;

var origin_x = 0;
var max_label_length_l = 0;
var max_label_length_r = 0;
var cursorX, cursorY, clicked, base_x, base_y, uriInput;
var animation_duration = 3000;
var diameter = width / 2 - margin,
  radius = diameter / 2,
  innerRadius = radius - 120;

var cluster;
var bundle;
var line;
var svg;
var link;
var rotation = 0; //D3 RELATED VARIABLES

//list of properties from W3C OWL and RDF spec
var properties = ["rdfs:range", "rdfs:domain", "rdf:type", "rdfs:subClassOf", "rdfs:subPropertyOf", "rdfs:subPropertyOf",  "owl:equivalentClass", "rdfs:subClassOf", "owl:disjointWith", "owl:complementOf", "owl:unionOf", "owl:intersectionOf", "owl:equivalentProperty", "owl:inverseOf", "owl:sameAs", "owl:differentFrom", "owl:AllDifferent"];
var colors = [];
var propertiesMinusPrefix = [];
var colorPairs = [];


$(document).ready(function(){
  $("#searchLink").fadeOut();//on load fadeout search link
  createCSSRules();//on load generate colors
})

document.onmousemove = function(e) {
  cursorX = e.pageX;
  cursorY = e.pageY;
}

function selectColor(colorNum, colors) {
  if (colors < 1) colors = 1; // defaults to one color - avoid divide by zero
  return "hsl(" + (colorNum * (360 / colors) % 360) + ",100%,50%)";
}

//generates random collors for links.
function createCSSRules() {

  properties.forEach(function(d) {
    var c;
    c = selectColor(Math.floor(Math.random() * 999), properties.length);
    colors.push(c);
  });
  properties.forEach(function(d, i) {
    var n = d.substring(d.indexOf(":") + 1);
    propertiesMinusPrefix.push(n);
    var l = {
      prop: n,
      color: colors[i],
      propfull: d
      // pos: pos
    };
    colorPairs.push(l);
    createCSSSelector('.' + n, 'stroke:' + colors[i] + ';stroke-width:' + strokewidth + 'px;stroke-opacity:0.4;');
  });
}


//regext to check if input is url
function isUrl(s) {
  var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  return regexp.test(s); //regex to check if input is uri
}

//on uri submission
$("#uriSubmit").click(function() {
  uriInput = $("#uriInput").val();
  uriSubmitCallback();
});

//on enter
$('#uriInput').keypress(function (e) {
 var key = e.which;
 if(key == 13)  // the enter key code
  {
    uriInput = $("#uriInput").val();
    uriSubmitCallback();
  }
});

function uriSubmitCallback(){
  if (uriInput !== undefined && uriInput !== "" && isUrl(uriInput)) {
    $("#uriForm").fadeOut();
    $("#searchLink").fadeIn("slow");
    var l = '<div class="throbber-loader">Loading…</div>';
    $(l).appendTo(".loadingBar");
    getRDF(uriInput);
  } else {
    var l = '<div class="alert alert-warning" role="alert">Incorrect Input!</div>';
    $(l).appendTo(".loadingBar");
  }
}

//reload page of clicking search
$("#searchLink").click(function() {
  window.location.reload(true);
  $(".errors").empty();
});

//function to find root
function findRoot(graph) {
  graph.forEach(function(d) {
    if (d["@type"] === "owl:Ontology") {
      root = d["@id"];
    }
  });
  if (root === undefined) {//if no root, make root
    root = uriInput;
    var l = {
      "@id": uriInput,
      children: []
    };
    graph.push(l);
  }
}

//async ajax call. tried non-async before. holy guac.
function getRDF(uri) {
  $.ajax({
    url: 'http://rdf-translator.appspot.com/convert/detect/json-ld/' + uri,
    type: 'GET',
    success: function(data) {
      try {
        findRoot(data["@graph"]);
      } catch (err) {
        console.log(err);//debugging
        if(err.name === 'NoRoot'){
          var l = '<div class="alert alert-danger" role="alert">Unable to find root node in vocab. Try a different one</div>';
          $(l).appendTo(".errors");
        }
      }

      try {
        draw(data["@graph"]);
        $(".loadingBar").fadeOut("slow");
      } catch (err) {
        console.log(err);//debugging
        if (err.name === 'TypeError') {
          console.log("Parsing Error");
          var l = '<div class="alert alert-danger" role="alert">Error parsing vocab</div>';
          $(l).appendTo(".errors");
          $(".loadingBar").fadeOut();
          $("#uriForm").fadeIn("slow");
        }
      }
    },
    error: function(e) {
      var l = '<div class="alert alert-danger" role="alert">Parsing Error!</div>';
      $(l).appendTo(".loadingBar").delay(1000);
      window.location.reload(true);
    }
  });
}

//draw diagram
function draw(rGraph) {
  cluster = d3.layout.cluster()
    .size([360, innerRadius])
    .sort(null)
    .value(function(d) {
      return d.size;
    });
  bundle = d3.layout.bundle()
  line = d3.svg.line.radial()
    .interpolate("bundle")
    .tension(.6)
    .radius(function(d) {
      return d.y;
    })
    .angle(function(d) {
      return d.x / 180 * Math.PI;
    });
  svg = d3.select("#dia_1").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
    .append("g");
  link = svg.append("g").selectAll(".link"),
    node = svg.append("g").selectAll(".node");
  var n = rGraph;
  var tree = {};
  var t = findNodes(tree, n);
  var lt = getLinks(n);
  var nodes = cluster.nodes(t),
    links = cluster.links(nodes);
  var d = links.concat(lt);//join both of the links arrays
  link = link
    .data(bundle(d))
    .enter().append("path")
    .each(function(d) {
      d.source = d[0], d.target = d[d.length - 1];
    })
    .attr("class", "link")
    .attr("d", line);

  node = node
    .data(nodes)
    .enter().append("text")
    .attr("class", "node")
    .attr("dy", ".31em")
    .each(function(d) {
      d.clicked = 0;
    })
    .each(function(d) {
      d.angle = (d.x - origin_x + 270 + 360) % 360;
    }) //add angle property to object
    .attr("transform", function(d) {
      return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)");
    })
    .style("text-anchor", function(d) {
      if (d.x < 180) {
        d.side = "right";
      } else {
        d.side = "left";
      }
      return d.x < 180 ? "start" : "end";
    })
    .text(function(d) {
      if (d.children !== undefined) {
        var t;
        if (d.label !== undefined) {
          t = d.label["en"];
        } else {
          t = d["@id"];
        }
        if (t !== undefined) {
          if (t.length >= 10) {
            var sub = t.substring(0, 10);
            sub += "...";
            return sub;
          } else if (t.length < 10) {
            return t;
          }
        }
        return "parent";
      } else {
        var t;
        if (d.label !== undefined) {
          t = d.label["en"];
        } else {
          t = d["@id"];
        }
        return t;
      }
    })
    .each(function(d) {
      var x = this.getBBox().width;
      if (d.side === "right") {
        if (x > max_label_length_r) {
          max_label_length_r = x;
        }
      } else {
        if (x > max_label_length_l) {
          max_label_length_l = x;
        }
      }
    })
    .on("mouseover", function(d) {
      mouseovered(d);
    })
    .on("mouseout", function(d) {
      // mouseouted(d);//commented out for now
    })
    .on("mousedown", function(d) {
      rotate(d, createToolTip);
      highlightData(d);
    });
    d3.select(self.frameElement).style("height", diameter + "px");//size
}

//probably don't need this anymore
function isArray(object) {
  if (object.constructor === Array) return true;
  else return false;
}

//creates info div
function createToolTip(d) {
  ///textboox source http://chimera.labs.oreilly.com/books/1230000000345/ch10.html#_html_div_tooltips
  d3.select("#tooltip").remove();//remove any previous tooltips

  var p_div_height = document.getElementById('dia_1').clientHeight;
  var pDivWidth = document.getElementById('dia_1').clientWidth;

  var page_width = $(window).width();
  var page_height = $(window).height();

  var nodeProps = [];
  var activeProps = [];
  var props = [];
  var ls = " ";
  var comment;

  //put all properties on object into array
  for (var property in d) {
    if (d.hasOwnProperty(property)) {
      nodeProps.push(property);
    }
  }

  //get list of active properties
  for(var i=0;i<nodeProps.length;i++){
    if(isInArray(nodeProps[i], properties)){
      activeProps.push(nodeProps[i]);
    }
  }

  //make sure comment is in check
  if (d["rdfs:comment"] !== undefined) {
    comment = d["rdfs:comment"]["@value"];
  } else {
    comment = "No comment available :(  ";
  }

  //generate divs
  for (var prop in d) {
    if (d.hasOwnProperty(prop)) {
      if (prop == "rdfs:comment") {
        comment = d[prop]["@value"];      }
      if (prop !== 'linksActive' && prop !== 'clicked' && prop !== 'parent' && prop !== 'depth' && prop !== 'x' && prop !== 'y' && prop !== 'angle' && prop !== 'side' && prop !== 'source' && prop !== 'target' && prop !== 'value' && prop != 'rdfs:comment' && prop !== 'children') { //excude d3 & customer properties
        var list_props = ' ';
        if (Array.isArray(d[prop])) {
          for (var x in d[prop]) {
            if(d[prop][x]["@value"]!==undefined){
              list_props += "<br>"+ ' ' + d[prop][x]["@value"];//for special snowflakes
            }else if(d[prop][x]["@id"]!==undefined){
              list_props += "<br>" + ' ' + d[prop][x]["@id"];
            }else if(d[prop][x] !== undefined){
              list_props += "<br>" + ' ' + d[prop][x];
            }
          }
        } else if (typeof d[prop] === 'object') {
          for (var p in d[prop]) {
            if (d[prop].hasOwnProperty(p)) {
              list_props += d[prop][p];
            }
          }
        } else {
          list_props = d[prop];
        }
        var t;
        if(isInArray(prop, activeProps)){
          var c = function(){
            var rc;
            colorPairs.forEach(function(l){
                if(prop === l.propfull){
                  rc = l.color;
                }
            });
            return rc;
          };
          var color = c();//cannot call anonymous function below
          t = '<li class="list-group-item" style="border-radius:5px;border:2px solid '+color+';" ><div><h5><b>' + prop + '</h5>' + list_props + '</b> </div></li>';
        }else{
          t = '<li class="list-group-item"><h4>' + prop + '</h4>' + list_props + '</li>';
        }
        ls += t;
        props.push(prop);
      }
    }
  }


  //if comment is undefined, ...
  if (comment !== undefined && comment.length > 100) {
    var s = comment.substring(0, 100);
    s += "..."
    comment = s;
  }

  //put tooltip together
  var tooltip = '<div id="tooltip"><div class="page-header"><h3 >' + d["@id"] + '</h3><div class="info"><p><small>' + comment + '</small></p></div><div class="nodeinfo"><ul class="list-group" style="height:300px;overflow-y: scroll;">' + ls + '</ul></div>';

  //append tooltip
  $( tooltip ).appendTo( ".tooltipsgohere" );
  var div_pos;
  if (d.side === "right") {
    div_pos = page_width - (page_width / 3);
  } else {
    div_pos = page_width / 6;
  }

  //place tooltip
  d3.select("#tooltip")
    .style("left", div_pos + "px")
    .style("top", page_height / 4 + "px")
    .style("position", "absolute");


  //Show the tooltip
  d3.select("#tooltip").classed("hidden", false);
  $("#tooltip").hide().fadeIn(animation_duration);

}


//on mouseover highlight links and nodes
function mouseovered(d) {

  node
    .each(function(n) {
      n.target = n.source = false;
    });

  //iterate over all colorpairs, and add link classes and css dynamically.
  colorPairs.forEach(function(x) {
    var propfull = x.propfull;
    var color = x.color;
    var propnoprefix = x.prop;

    link.classed(propnoprefix, function(l) {
      if (d[propfull] !== undefined) {
        if (l.source["@id"] === d["@id"]) {
          if (l.target["@id"] === d[propfull]["@id"]) {
            if (d.linksActive === undefined) {
              d.linksActive = [];
            } else {
              d.linksActive.push(propfull);
            }
            return l.target.target = true;
          }
        }
      }
    });
  });

  link
    .classed("link--target", function(l) {
      if (l.target === d) {
        return l.source.source = true;
      }
    })
    .classed("link--source", function(l) {
      if (l.source === d) {
        return l.target.target = true;
      }
    })
    .classed("link--inactive", function(l) {
      if (l.source !== d && l.target !== d) {
        return l = true;
      }
    })
    .filter(function(l) {
      return l.target === d || l.source === d;
    })
    .each(function() {
      this.parentNode.appendChild(this);
    });

  node
    .classed("node--clicked", function(n) {
      if (n == d) {
        return d = true;
      }
    })
    .classed("node--target", function(n) {
      return n.target;
    })
    .classed("node--source", function(n) {
      return n.source;
    })
    .classed("node--inactive", function(n) {
      if (!n.source && !n.target && n !== d) {
        // console.log(n);
        return n = true;
      }
    });
}

//on mouse out
function mouseouted(d) {

  link
    .classed("link--target", false)
    .classed("link--source", false)
    .classed("link--inactive", false);

  node
    .classed("node--target", false)
    .classed("node--source", false)
    .classed("node--inactive", false);
}

//generic if in array function
function isInArray(value, array) {
  return array.indexOf(value) > -1;
}

//creates heirarchy
function findNodes(tree, nodes) { //creates hierarchical tree from jsonld nodes

  var map = []; //declare map

  nodes.forEach(function(d) { //
    if (d["@id"] !== undefined) {
      if (d.children === undefined) {
        d.children = []; //create array property for children
      }
      map[d["@id"]] = d;
    }
  });

  map["properties"] = {
    "@id": "properties",
    children: [],
    parent: map[root]
  }; //populate and pepare map
  map[root].children.push(map["properties"]);

  function findChildren(name, n) { //recursive children finder function
    var node = map[name],
      type;

    if (node !== undefined) {
      node = map[name];
      type = node["@type"];

      //if type is ontology
      if (type == "owl:Ontology" || node["@id"] == root) {
        node.parent = null;
        return node;
      } //root

      if (type == "owl:Class" || type == "rdfs:Class") {
        if (!isInArray(node, map[root].children)) {
          node.parent = map[root]; //chnage to root function later
          node.parent.children.push(node);
          return node;
        }
      } //if type class, parent = root

      //if type is property
      if (!(type in map)) {

        node.parent = map["properties"];
        node.parent.children.push(node);
        return node;
      } else {
        if (node["@id"] !== undefined) {
          if (type != "owl:Ontology" || node["@id"] != root) {
            node.parent = findChildren(type);
            node.parent.children.push(node);
          }
        }
      }
    }
    return node;
  }

  //initiates recursion to find children
  if (nodes.length) {
    nodes.forEach(function(d) {
      findChildren(d["@id"], d);
    }); //iterate over every node
  }
  return map[root];
}

//finds links between nodes
function getLinks(nodes) {
  var map = [],
    links = [];

  nodes.forEach(function(d) {
    if (d["@id"] !== undefined) {
      map[d["@id"]] = d;
    }
  });
  map["properties"] = {
    "@id": "properties",
    children: [],
    parent: root
  };

  nodes.forEach(function(d) {
    properties.forEach(function(x) {
      findLinksForProp(x, d); //iterate over all properties in array
    });
  });

  //generic function for finding links between nodes using a property parameter
  function findLinksForProp(prop, d) {
    if (d[prop] !== undefined) {

      if(d[prop]["@list"]!==undefined){//if @list exists
        d[prop]["@list"].forEach(function(x){
          var l = {};
          l.source = map[d["@id"]];
          l.target = map[x["@id"]];
          l.type = "range";
          if (linkObjectEmpty(l)) {
            links.push(l);
          }
        });

      }else if (Array.isArray(d[prop])) {
          d[prop].forEach(function(x) {//if pure array
            var l = {};
            l.source = map[d["@id"]];
            l.target = map[x["@id"]];
            l.type = "range";
            if (linkObjectEmpty(l)) {
              links.push(l);
            }
          });

      } else {
        var l = {};
        l.source = map[d["@id"]];
        l.target = map[d[prop]["@id"]];
        l.type = "range";
        if (linkObjectEmpty(l)) {
          links.push(l);
        }
      }
    }
  }


  function linkObjectEmpty(l) { //checks if both source and target are not empty
    if (l.source !== undefined && l.target !== undefined) {
      return true;
    } else {
      return false;
    }
  }

  return links;
}


//rotates diagram, callback on end of run
function rotate(d, callback) {
  clicked = 1;
  var pDivWidth = document.getElementById('dia_1').clientWidth;
  var dAngle = d.angle;
  var rotationAmount;
  var translateAmount = pDivWidth / 3;

  if (d.side === "right") {
    rotationAmount = dAngle * -1; // for nodes on right side, convert to negative to rotate the right way
    translateAmount = translateAmount * -1;
  } else {
    rotationAmount = 180 - dAngle; //for nodes on left side
    translateAmount = translateAmount * 1; //not needed, here just to make me feel better
  }
  svg
    .transition()
    .duration(animation_duration)
    .attr("transform", "translate(" + translateAmount + "," + 0 + "),rotate(" + rotationAmount + ") ")
    .each("end", callback(d));
}

//test function for highlighting, probably dont need it anymore. Deprecated
function highlightData(d) {
  node
    .each(function(n) {
      n.target = n.source = false;
    });

  link
    .classed("link--target", function(l) {
      if (l.target === d) {
        return l.source.source = true;
      }
    })
    .classed("link--source", function(l) {
      if (l.source === d) {
        return l.target.target = true;
      }
    })
    .classed("link--inactive", function(l) {
      if (l.source !== d && l.target !== d) {
        return l = true;
      }
    })
    .filter(function(l) {
      return l.target === d || l.source === d;
    })
    .each(function() {
      this.parentNode.appendChild(this);
    });

  node

    .classed("node--target", function(n) {
      return n.target;
    })
    .classed("node--source", function(n) {
      return n.source;
    })
    .classed("node--inactive", function(n) {
      if (!n.source && !n.target && n !== d) {
        return n = true;
      }
    })
    .classed("node--clicked", function(n) {
      if (n == d) {
        return d = true;
      }
    });

}

function animationtest(d) {
  console.log("animating");
  svg.transition()
    .duration(2000)
    .attr("transform", "translate(50, 50)");

}

//source http://stackoverflow.com/questions/1720320/how-to-dynamically-create-css-class-in-javascript-and-apply
//looks some sort of magic.
function createCSSSelector(selector, style) {
  if (!document.styleSheets) {
    return;
  }

  if (document.getElementsByTagName('head').length == 0) {
    return;
  }

  var stylesheet, mediaType;

  if (document.styleSheets.length > 0) {
    for (i = 0; i < document.styleSheets.length; i++) {
      if (document.styleSheets[i].disabled) {
        continue;
      }
      var media = document.styleSheets[i].media;
      mediaType = typeof media;

      if (mediaType == 'string') {
        if (media == '' || (media.indexOf('screen') != -1)) {
          styleSheet = document.styleSheets[i];
        }
      } else if (mediaType == 'object') {
        if (media.mediaText == '' || (media.mediaText.indexOf('screen') != -1)) {
          styleSheet = document.styleSheets[i];
        }
      }

      if (typeof styleSheet != 'undefined') {
        break;
      }
    }
  }

  if (typeof styleSheet == 'undefined') {
    var styleSheetElement = document.createElement('style');
    styleSheetElement.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(styleSheetElement);

    for (i = 0; i < document.styleSheets.length; i++) {
      if (document.styleSheets[i].disabled) {
        continue;
      }
      styleSheet = document.styleSheets[i];
    }

    var media = styleSheet.media;
    mediaType = typeof media;
  }

  if (mediaType == 'string') {
    for (i = 0; i < styleSheet.rules.length; i++) {
      if (styleSheet.rules[i].selectorText && styleSheet.rules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
        styleSheet.rules[i].style.cssText = style;
        return;
      }
    }

    styleSheet.addRule(selector, style);
  } else if (mediaType == 'object') {
    var styleSheetLength = (styleSheet.cssRules) ? styleSheet.cssRules.length : 0;

    for (i = 0; i < styleSheetLength; i++) {
      if (styleSheet.cssRules[i].selectorText && styleSheet.cssRules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
        styleSheet.cssRules[i].style.cssText = style;
        return;
      }
    }

    styleSheet.insertRule(selector + '{' + style + '}', styleSheetLength);
  }
}
