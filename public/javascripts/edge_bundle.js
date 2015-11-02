
// var root = "http://purl.org/goodrelations/v1";//temp, will change to function later
// var root = "http://www.w3.org/ns/prov-links#";
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


    var cluster = d3.layout.cluster()
            .size([360, innerRadius])
            .sort(null)
            .value(function(d) { return d.size; });

    var bundle = d3.layout.bundle()

    var line = d3.svg.line.radial()
            .interpolate("bundle")
            .tension(.6)
            .radius(function(d) { return d.y; })
            .angle(function(d) { return d.x / 180 * Math.PI; });

    var svg = d3.select("#dia_1").append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width/2 + "," + height/2 + ")")
            // .call(d3.behavior.zoom().on("zoom", function () {
            //     svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
            // }))
            .append("g");


    var link = svg.append("g").selectAll(".link"),
            node = svg.append("g").selectAll(".node");

    document.onmousemove = function(e){
            cursorX = e.pageX;
            cursorY = e.pageY;
    }
    // setInterval("checkCursor()", 50);//check mouse pos ever interval

    // function checkCursor(){
    //     console.log("Cursor at: " + cursorX + ", " + cursorY);
    // }
    // draw();

    $("#uriSubmit").click(function(){
         uriInput = $("#uriInput").val();
         if(uriInput !== undefined && uriInput !== ""){
           $("#uriForm").fadeOut();
          //  var l = '<div class="loader">Loading...</div>';
          //  $(l).appendTo(".loadingBar");
           getRDF(uriInput);
           console.log(uriInput);
         }
    });



    function findRoot(graph){
      graph.forEach(function (d){
        if(d["@type"]==="owl:Ontology"){
          root = d["@id"];
        }
        // console.log(d["@type"]);
      });
      if(root === undefined){
        root = "aglsterms:";
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
          findRoot(data["@graph"]);
          draw(data["@graph"]);

        },
        error: function(e) {
      	//called when there is an error
      	console.log(e);
        }
      });
      // var xhr = new XMLHttpRequest();
      // // xhr.open("GET", "http://rdf-translator.appspot.com/convert/detect/json-ld/http://www.w3.org/ns/prov", false);
      // xhr.open("GET", "http://rdf-translator.appspot.com/convert/detect/json-ld/"+uri, false);
      // xhr.send();
      //
      // console.log(xhr.status);
      // console.log(xhr.statusText);
      // console.log(xhr);
      // // console.log(JSON.parse(xhr.response));
      // var responseGraph = JSON.parse(xhr.response);
      // console.log(responseGraph);
      // console.log(responseGraph["@graph"]);
      //
      // draw(responseGraph["@graph"]);
    }


    // draw(responseGraph["@graph"]);



function draw(rGraph){

    d3.json("jsondata/jsonld5.jsld", function(graph) {
//        if (error) throw error;

        // var n = graph["@graph"];
        var n = rGraph;
        var tree = {};

        var t = findnodes(tree, n);
        var lt = get_links(n);

        console.log(lt);
        console.log(t);

        var nodes = cluster.nodes(t), links = cluster.links(nodes);
        var d = links.concat(lt);

        link = link
                .data(bundle(d))
                .enter().append("path")
                .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
                .attr("class", "link")
                .attr("d", line);

        node = node
                // .data(nodes.filter(function(n) { return !n.children; }))
               .data(nodes)
                .enter().append("text")
                .attr("class", "node")
                .attr("dy", ".31em")
                .each(function(d){d.clicked = 0;})
                .each(function(d) { d.angle = (d.x - origin_x+270+360)%360; })//add angle property to object
                .attr("transform", function(d) {

                    // console.log(d.x+90);
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
                    // return d["@id"];
                })
                .each(function (d){

                    // console.log(this.getBBox().width);
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
                    // console.log(max_label_length_l);
                })
                .on("mouseover", function(d){
                    mouseovered(d);
//                    tip.show();
                })
                .on("mouseout", function(d){
                    mouseouted(d);
                })
                .on("mousedown", function(d){
                    rotate(d, create_tool_tip);
                    highlight_data(d);
                    // create_tool_tip(d);
                    // animationtest(d);
                });
                // console.log(node);
    });

    // console.log(svg);

}

    d3.select(self.frameElement).style("height", diameter + "px");

    function create_tool_tip_with_title(title){//used to create tooltips for source/targets (unused for now)
        d = {};
        d["@id"] = title;
        create_tool_tip(d);
    }

    function createtree(tree, tooltip, data){

        var circle = tree.append("circle")
                         .attr("cx", 30)
                         .attr("cy", 30)
                         .attr("r", 20);

        function create_json_data(){

        }
        // console.log(data);


    }

    function create_tool_tip(d){
        ///textboox source http://chimera.labs.oreilly.com/books/1230000000345/ch10.html#_html_div_tooltips
            //Get this bar's x/y values, then augment for the tooltip
            d3.select("#tooltip").remove();

            var p_div_height = document.getElementById('dia_1').clientHeight;
            var p_div_width =  document.getElementById('dia_1').clientWidth;

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

            // var subtree = d3.select(".subtree")
            //                 .append("svg:svg")
            //                 .attr("width", 300)//canvasWidth)
            //                 .attr("height", 300);//canvasHeight);

            // createtree(subtree, tooltip, d);

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


    function mouseovered(d) {


        // rotate();
        // var x = d3.select(this);

        // console.log(d.angle);
        // console.log(d.side);

             node
                        .each(function(n) { n.target = n.source = false; });

                link
                        .classed("link--target", function(l) {
                            if (l.target === d){
                                // console.log(l.source);
                                return l.source.source = true;
                            }
                        })
                        .classed("link--source", function(l) {
                            if (l.source === d){
                                // console.log(l.target);
                                // create_tool_tip_with_title(l.target["@id"]);
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

    function mouseouted(d) {



            //Hide the tooltip
            // d3.select("#tooltip").remove();

                link
                    .classed("link--target", false)
                    .classed("link--source", false)
                    .classed("link--inactive", false);

                node
                    .classed("node--target", false)
                    .classed("node--source", false)
                    .classed("node--inactive", false);




    }

    function findnodes(tree,nodes){//creates hierarchical tree from jsonld nodes

        var map = []; //declare map


        nodes.forEach(function(d){//
            if(d["@id"]!== undefined){
                if(d.children === undefined){
                    d.children = [];//create array property for children
                }
                map[d["@id"]] = d;
            }
        });
        // console.log(map);
        map["properties"] = {"@id": "properties", children: [], parent: map[root]};//populate and pepare map
        map[root].children.push(map["properties"]);
//        console.log(map);

        function isInArray(value, array) {
            return array.indexOf(value) > -1;
        }

        function find_children(name, n){//recursive children finder function
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



                  node.parent = map["properties"];
                  node.parent.children.push(node);
                  console.log(map["properties"]);
                  return node;

                  // console.log(node);
                    // if (node["rdfs:domain"] !== undefined) {
                    //     if(!(node["rdfs:domain"]["@id"] in map)){
                    //       // console.log(node["rdfs:domain"]);
                    //       map[node["rdfs:domain"]["@id"]] = {"@id": node["rdfs:domain"]["@id"], children: []};
                    //     }
                    //     node.parent = map[node["rdfs:domain"]["@id"]];
                    //     node.parent.children.push(node);
                    //     return node;
                    // } else {
                    //     node.parent = map["properties"];
                    //     node.parent.children.push(node);
                    //     return node;
                    // }//if type != map, use domain as parent

                } else {
                    // console.log(node);
                    if (node["@id"] !== undefined) {
                        if (type != "owl:Ontology" || node["@id"] != root) {
                            // console.log(node);
                            node.parent = find_children(type);
                            node.parent.children.push(node);
                        }
//                        /find parents for non special cases
                    }
                }
            }
            return node;
        }

        if(nodes.length){
            nodes.forEach(function(d){
                find_children(d["@id"], d);
            });//iterate over every node
        }
        console.log(map);
        return map[root];
    }

    function get_links(nodes){
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

                        if(link_object_empty(l)){
                            links.push(l);
                        }
                    });
                }else{
                    var l = {};
                    l.source = map[d["@id"]];
                    l.target = map[d["rdfs:subClassOf"]["@id"]];
                    if(link_object_empty(l)){
                        links.push(l);
                    }
                }
            }

            if(d["owl:equivalentClass"]!==undefined){
                var l = {};
                l.source = map[d["@id"]];
                l.target = map[d["owl:equivalentClass"]["@id"]];
                if(link_object_empty(l)){
                    links.push(l);
                }
            }

            if(d["owl:disjointWith"]!== undefined){
                if(Array.isArray(d["owl:disjointWith"])){
                    d["owl:disjointWith"].forEach(function(x){
                       var l = {};
                        l.source = map[d["@id"]];
                        l.target = map[x["@id"]];
                        if(link_object_empty(l)){
                            links.push(l);
                        }
                    });
                }else{
                  var l ={};
                  l.source =   map[d["@id"]];
                  l.target =   map[d["owl:disjointWith"]];
                  if(link_object_empty(l)){
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
                    if(link_object_empty(l)){
                      links.push(l);
                    }
                });
              }else{
                var l = {};
                l.source = map[d["@id"]];
                l.target = map[d["rdfs:range"]["@id"]];
                if(link_object_empty(l)){
                  links.push(l);
                }
              }
            }

          //  if(d["rdfs:range"]!==undefined){
          //     l = {source: map[d["rdfs:range"]["@id"]], target: map[d["@id"]]};
          //  }
          //  console.log(l);
          //  if(l.source !== undefined && l.target !== undefined){
          //      links.push(l);
          //  }

        });

        function link_object_empty(l){//checks if both source and target are not empty
            if(l.source !== undefined && l.target !== undefined){
                return true;
            }else{
                return false;
            }
        }


        return links;

    }

    var rotation = 0;
    function rotate(d, callback) {

        clicked = 1;
        // create_tool_tip(d);
        var p_div_width =  document.getElementById('dia_1').clientWidth;
        var d_angle = d.angle;
        var rotation_amount;
        var translate_amount = p_div_width/3;

        if(d.side ==="right"){
            // rotation_amount = 180+d_angle;
            rotation_amount = d_angle * -1; // for nodes on right side, convert to negative to rotate the right way
            translate_amount = translate_amount * -1;
        }else{
            // rotation_amount = d_a/ngle;
            rotation_amount = 180-d_angle; //for nodes on left side
            translate_amount = translate_amount * 1;//not needed, here just to make me feel better
        }
        svg
            .transition()
            .duration(animation_duration)
            .attr("transform", "translate(" + translate_amount + "," + 0 + "),rotate("+rotation_amount+") ")
            .each("end", callback(d));


        // callback(d);
            // .transition()
            // .duration(2000)
            // .attr("transform", "rotate("+(rotation_amount)+")");
        // callback(d);
    }

    function highlight_data(d){

        // clicked = 1; //on mouse up d,clicked =0

        node
                .each(function(n) { n.target = n.source = false; });

        link
                .classed("link--target", function(l) {
                    if (l.target === d){
                        // console.log(l.source);
                        return l.source.source = true;
                    }
                })
                .classed("link--source", function(l) {
                    if (l.source === d){
                        // console.log(l.target);
                        // create_tool_tip_with_title(l.target["@id"]);
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
                        // console.log(n);
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

    function pointDirection(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI); //180/mathpi converts from rad to deg
    }
