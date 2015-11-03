
// var root = "http://purl.org/goodrelations/v1";//temp, will change to function later
// var root = "http://www.w3.org/ns/prov-links#";

$("#searchLink").fadeOut();

var root;
var margin = 50;
var width = $(window).width()-margin,
            height = $(window).height()-margin;

var origin_x = 0;
var max_label_length_l=0;
var max_label_length_r=0;
var cursorX, cursorY, clicked, base_x, base_y, uriInput;
var animation_duration = 3000;
var diameter = width/2-margin,
        radius = diameter / 2,
        innerRadius = radius - 120;

var cluster;
var bundle;
var line;
var svg;
var link;//D3 RELATED VARIABLES




    document.onmousemove = function(e){
            cursorX = e.pageX;
            cursorY = e.pageY;
    }

function isUrl(s) {
   var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
   return regexp.test(s); //regex to check if input is uri
}

    //on uri submission
    $("#uriSubmit").click(function(){
         uriInput = $("#uriInput").val();
         if(uriInput !== undefined && uriInput !== ""  && isUrl(uriInput)){
           $("#uriForm").fadeOut();
           $("#searchLink").fadeIn("slow");
           var l = '<div class="throbber-loader">Loading…</div>';
           $(l).appendTo(".loadingBar");
           getRDF(uriInput);
           console.log(uriInput);
         }else{
           var l = '<div class="alert alert-warning" role="alert">Incorrect Input!</div>';
           $(l).appendTo(".loadingBar");
         }
    });

    //reload page of clicking search
    $("#searchLink").click(function(){
        window.location.reload(true);
        $(".errors").empty();
    });

    //function to find roo
    function findRoot(graph){
      graph.forEach(function (d){
        if(d["@type"]==="owl:Ontology"){
          root = d["@id"];
        }
        // console.log(d["@type"]);
      });
      if(root === undefined){
        throw 'NoRoot';//temp
        //maybe add a temp root to data array? eg root = uri
      }
    }

    //async ajax call. tried non-async before. holy guac.
    function getRDF(uri){
      $.ajax({
        url: 'http://rdf-translator.appspot.com/convert/detect/json-ld/'+uri,
        type: 'GET',
        success: function(data) {
      	//called when successful
        console.log(data);
          try{
            findRoot(data["@graph"]);
          }catch(err){
            // if(err.name === 'NoRoot'){
              var l = '<div class="alert alert-danger" role="alert">Unable to find root node in vocab</div>';
              $(l).appendTo(".errors");
            // }
          }

          try{
            draw(data["@graph"]);
            $(".loadingBar").fadeOut("slow");
          }catch(err){
            console.log(err);

            if(err.name === 'TypeError'){
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
      	  // console.log(e);
        }
     });
    }

//draw diagram
function draw(rGraph){

  cluster = d3.layout.cluster()
          .size([360, innerRadius])
          .sort(null)
          .value(function(d) { return d.size; });

  bundle = d3.layout.bundle()

  line = d3.svg.line.radial()
          .interpolate("bundle")
          .tension(.6)
          .radius(function(d) { return d.y; })
          .angle(function(d) { return d.x / 180 * Math.PI; });

  svg = d3.select("#dia_1").append("svg")
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", "translate(" + width/2 + "," + height/2 + ")")
          .append("g");


  link = svg.append("g").selectAll(".link"),
          node = svg.append("g").selectAll(".node");

    // d3.json("jsondata/jsonld5.jsld", function(graph) {
        var n = rGraph;
        var tree = {};
        var t = findNodes(tree, n);
        var lt = getLinks(n);

        var nodes = cluster.nodes(t), links = cluster.links(nodes);
        var d = links.concat(lt);

        link = link
                .data(bundle(d))
                .enter().append("path")
                .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
                .attr("class", "link")
                .attr("d", line);

        node = node
               .data(nodes)
                .enter().append("text")
                .attr("class", "node")
                .attr("dy", ".31em")
                .each(function(d){d.clicked = 0;})
                .each(function(d) { d.angle = (d.x - origin_x+270+360)%360; })//add angle property to object
                .attr("transform", function(d) {
                    return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)");
                })
                .style("text-anchor", function(d) {
                    if(d.x < 180){d.side = "right";}else{d.side = "left";}
                    return d.x < 180 ? "start" : "end";
                })
                .text(function(d) {
                    //probs put this somewhere else later
                    if(d["@id"]==="http://purl.org/goodrelations/v1"){
                        console.log(d);
                        base_x = d.x;
                        base_y = d.y;
                    }
                    if(d.children!==undefined){
                        var t;
                        if(d.label !== undefined){
                            t = d.label["en"];
                        }else{
                            t = d["@id"];
                        }
                        if(t!==undefined){
                            if(t.length >= 10){
                                var sub = t.substring(0, 10);
                                sub += "...";
                                return sub;
                            }else if(t.length <10){
                                return t;
                            }
                        }
                        return "parent";
                    }else{
                        var t;
                        if(d.label !== undefined){
                            t= d.label["en"];
                        }else{
                            t= d["@id"];
                        }
                        return t;
                    }
                })
                .each(function (d){
                    var x = this.getBBox().width;
                    if(d.side==="right"){
                        if(x>max_label_length_r){
                            max_label_length_r=x;
                        }
                    }else{
                        if(x > max_label_length_l){
                            max_label_length_l = x;

                        }
                    }
                })
                .on("mouseover", function(d){
                    mouseovered(d);
                })
                .on("mouseout", function(d){
                    mouseouted(d);
                })
                .on("mousedown", function(d){
                    rotate(d, createToolTip);
                    highlightData(d);
                });
}

    d3.select(self.frameElement).style("height", diameter + "px");

    function createToolTipWithTitle(title){//used to create tooltips for source/targets (unused for now)
        d = {};
        d["@id"] = title;
        createToolTip(d);
    }

    //for testing
    function createtree(tree, tooltip, data){
        var circle = tree.append("circle")
                         .attr("cx", 30)
                         .attr("cy", 30)
                         .attr("r", 20);

        function create_json_data(){

        }
      }

      //creates info div
    function createToolTip(d){
        ///textboox source http://chimera.labs.oreilly.com/books/1230000000345/ch10.html#_html_div_tooltips
            //Get this bar's x/y values, then augment for the tooltip
            d3.select("#tooltip").remove();

            var p_div_height = document.getElementById('dia_1').clientHeight;
            var pDivWidth =  document.getElementById('dia_1').clientWidth;

            var page_width = $(window).width();
            var page_height = $(window).height();
            // console.log(page_width);

            console.log(d);
            var xPosition = cursorX;//parseFloat(d3.select(this).attr("x")) + xScale.rangeBand() / 2;
            var yPosition = cursorY;//parseFloat(d3.select(this).attr("y")) / 2 + h / 2;
            var props = [];
            var ls = " ";
            var comment;

            if(Array.isArray(d["owl:disjointWith"])){
                console.log("ARRAY");
            }

            if(d["rdfs:comment"]!== undefined){
                comment = d["rdfs:comment"]["@value"];
            }else{
                comment = "...";
            }
            //Update the tooltip position and value

            console.log(cursorX + ", " + cursorY);

            for (var prop in d){
                // console.log(prop);
                if(d.hasOwnProperty(prop)){

                    if(prop == "rdfs:comment"){
                        comment = d[prop]["@value"];
                        // console.log(d[prop]);
                    }
                    if(prop !== 'clicked' && prop !== 'parent' && prop !== 'depth' && prop !== 'x' && prop !== 'y' && prop !== 'angle' && prop !== 'side' && prop !== 'source' && prop !== 'target' && prop !== 'value' && prop != 'rdfs:comment' && prop !== 'children'){//excude d3 & customer properties
                        var list_props = ' ';

                        if(Array.isArray(d[prop])){
                            for(var x in d[prop]){
                                list_props +=  "<br>" + ' '+ d[prop][x]["@id"];
                            }
                        }else if(typeof d[prop] === 'object'){
                            for(var p in d[prop]){
                               if(d[prop].hasOwnProperty(p)){
                                list_props += d[prop][p];
                               }
                            }
                        }else{

                            list_props = d[prop];

                        }
                        var t = '<li class="list-group-item"><h5>'+prop+'</h4>'+list_props+'</li>';
                        ls += t;
                        props.push(prop);
                    }
                }
            }

            // console.log(ls);

              if(comment !== undefined && comment.length > 100){
                  var s = comment.substring(0, 100);
                  s += "..."
                  comment = s;
              }

            var tooltip = '<div id="tooltip" class="hidden"><div class="page-header"><h3>' +d["@id"]+ '</h3><div class="info"><p><small>'+comment+'</small></p></div><div class="nodeinfo"><ul class="list-group">'+ls+'</ul></div>';

            $(".tooltipsgohere").append(tooltip);
            var div_pos;
            if(d.side === "right"){
                div_pos = page_width - (page_width/3);
            }else{
                div_pos = page_width/6;//TEMP
            }
            // console.log("label.lenght = " + max_label_length);
            d3.select("#tooltip")
              .style("left", div_pos + "px")
              .style("top", page_height/4 + "px")
              .style("position", "absolute");


              //Show the tooltip
            d3.select("#tooltip").classed("hidden", false);
            $("#tooltip").hide().fadeIn(animation_duration);


    }

    //on mouseover highlight links and nodes
    function mouseovered(d) {

             node
                        .each(function(n) { n.target = n.source = false; });

                link
                        .classed("link--target", function(l) {
                            if (l.target === d){
                                return l.source.source = true;
                            }
                        })
                        .classed("link--source", function(l) {
                            if (l.source === d){
                                return l.target.target = true;
                             }
                        })
                        .classed("link--inactive", function (l){
                            if(l.source !== d && l.target !== d){
                                return l = true;
                            }
                        })
                        .filter(function(l) {
                            return l.target === d || l.source === d;
                        })
                        .each(function() { this.parentNode.appendChild(this); });

                node
                        .classed("node--clicked", function(n) {
                            if(n==d){return d=true;}
                        })
                        .classed("node--target", function(n) { return n.target; })
                        .classed("node--source", function(n) { return n.source; })
                        .classed("node--inactive", function(n){
                            if(!n.source&&!n.target&&n!==d){
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

    //creates heirarchy
    function findNodes(tree,nodes){//creates hierarchical tree from jsonld nodes

        var map = []; //declare map


        nodes.forEach(function(d){//
            if(d["@id"]!== undefined){
                if(d.children === undefined){
                    d.children = [];//create array property for children
                }
                map[d["@id"]] = d;
            }
        });

          map["properties"] = {"@id": "properties", children: [], parent: map[root]};//populate and pepare map
          map[root].children.push(map["properties"]);



        function isInArray(value, array) {
            return array.indexOf(value) > -1;
        }

        function findChildren(name, n){//recursive children finder function
            var node = map[name], type;

            if(node!==undefined) {
                node = map[name];
                type = node["@type"];

                //if type is ontology
                if(type == "owl:Ontology" || node["@id"]==root){
                    node.parent = null;
                    // console.log(node);
                    return node;
                }//root

                if (type == "owl:Class" || type == "rdfs:Class") {
                    if(!isInArray(node, map[root].children)) {
                        node.parent = map[root];//chnage to root function later
                        node.parent.children.push(node);
                        return node;
                    }
                }//if type class, parent = root

                //if type is property
                if (!(type in map)) {
                  //TODO if type is array (aka multiple types)

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
        if(nodes.length){
            nodes.forEach(function(d){
                findChildren(d["@id"], d);
            });//iterate over every node
        }
        return map[root];
    }

    //finds links between nodes
    function getLinks(nodes){
        var map = [], links = [];
        nodes.forEach(function(d){
            if(d["@id"]!== undefined){
                map[d["@id"]] = d;
            }
        });
        map["properties"] = {"@id": "properties", children: [], parent: root};
        console.log(map);

        nodes.forEach(function(d){
            //special cases
            if(d["gr:hasNext"]!==undefined){
                links.push({source: map[d["@id"]], target: map[d["gr:hasNext"]["@id"]]});
                links.push({source: map[d["@id"]], target: map["gr:hasNext"]})
            }
            if(d["gr:hasPrevious"]!==undefined){
                links.push({source: map[d["@id"]], target: map[d["gr:hasPrevious"]["@id"]]});
                links.push({source: map[d["@id"]], target: map["gr:hasPrevious"]})
            }

            if(d["rdfs:subClassOf"]!== undefined){
                if(Array.isArray(d.subClassOf)){
                    d["rdfs:subClassOf"].forEach(function(x){
                        var l = {};
                        l.source = map[d["@id"]];
                        l.target = map[x["@id"]];

                        if(linkObjectEmpty(l)){
                            links.push(l);
                        }
                    });
                }else{
                    var l = {};
                    l.source = map[d["@id"]];
                    l.target = map[d["rdfs:subClassOf"]["@id"]];
                    if(linkObjectEmpty(l)){
                        links.push(l);
                    }
                }
            }

            if(d["owl:equivalentClass"]!==undefined){
                var l = {};
                l.source = map[d["@id"]];
                l.target = map[d["owl:equivalentClass"]["@id"]];
                if(linkObjectEmpty(l)){
                    links.push(l);
                }
            }

            if(d["owl:disjointWith"]!== undefined){
                if(Array.isArray(d["owl:disjointWith"])){
                    d["owl:disjointWith"].forEach(function(x){
                       var l = {};
                        l.source = map[d["@id"]];
                        l.target = map[x["@id"]];
                        if(linkObjectEmpty(l)){
                            links.push(l);
                        }
                    });
                }else{
                  var l ={};
                  l.source =   map[d["@id"]];
                  l.target =   map[d["owl:disjointWith"]];
                  if(linkObjectEmpty(l)){
                    links.push(l);
                  }
                }
            }

            if(d["rdfs:range"]!==undefined){
              if(Array.isArray(d["rdfs:range"])){//pretty much always will be array, but this is just in case
                d["rdfs:range"].forEach(function(x){
                    var l = {};
                    l.source = map[d["@id"]];
                    l.target = map[x["@id"]];
                    if(linkObjectEmpty(l)){
                      links.push(l);
                    }
                });
              }else{
                var l = {};
                l.source = map[d["@id"]];
                l.target = map[d["rdfs:range"]["@id"]];
                if(linkObjectEmpty(l)){
                  links.push(l);
                }
              }
            }

        });

        function linkObjectEmpty(l){//checks if both source and target are not empty
            if(l.source !== undefined && l.target !== undefined){
                return true;
            }else{
                return false;
            }
        }
        return links;
    }

    var rotation = 0;

    //rotates diagram, callback on end of run
    function rotate(d, callback) {
        clicked = 1;
        var pDivWidth =  document.getElementById('dia_1').clientWidth;
        var dAngle = d.angle;
        var rotationAmount;
        var translateAmount = pDivWidth/3;

        if(d.side ==="right"){
            rotationAmount = dAngle * -1; // for nodes on right side, convert to negative to rotate the right way
            translateAmount = translateAmount * -1;
        }else{
            rotationAmount = 180-dAngle; //for nodes on left side
            translateAmount = translateAmount * 1;//not needed, here just to make me feel better
        }
        svg
            .transition()
            .duration(animation_duration)
            .attr("transform", "translate(" + translateAmount + "," + 0 + "),rotate("+rotationAmount+") ")
            .each("end", callback(d));
    }

    function highlightData(d){
        node
                .each(function(n) { n.target = n.source = false; });

        link
                .classed("link--target", function(l) {
                    if (l.target === d){
                        return l.source.source = true;
                    }
                })
                .classed("link--source", function(l) {
                    if (l.source === d){
                        return l.target.target = true;
                     }
                })
                .classed("link--inactive", function (l){
                    if(l.source !== d && l.target !== d){
                        return l = true;
                    }
                })
                .filter(function(l) {
                    return l.target === d || l.source === d;
                })
                .each(function() { this.parentNode.appendChild(this); });

        node

                .classed("node--target", function(n) { return n.target; })
                .classed("node--source", function(n) { return n.source; })
                .classed("node--inactive", function(n){
                    if(!n.source&&!n.target&&n!==d){
                        return n = true;
                    }
                })
                .classed("node--clicked", function(n) {
                            if(n==d){return d=true;}
                });

    }

    function animationtest (d){
        console.log("animating");
        svg.transition()
            .duration(2000)
            .attr("transform", "translate(50, 50)");

    }
