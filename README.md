# rdfvis

RDF visualisation using D3.js.

A unqique way to look at RDF/OWL vocabs using D3.js. This visualisation works by receiving a URI and processing the linked vocab to a format easily readable by javascript, in this case JSON-LD. Currently hosted on Node.js Will work by simply cloning the repo and running 'npm start'. Though this app doesn't really need node.js, it was a simple evironment to in. 

Currently Tested and working with Chrome v46.


![Alt text](http://i.imgur.com/9N6ib68.png "...")

![Alt text](http://i.imgur.com/zr1Dehs.png "...")

![Alt text](http://i.imgur.com/4xaxJV3.png "...")

The edge_bundle.js file relies on:
index.ejs (in the views folder) for insertion of divs, but this can be easily changed
D3.js, Jquery, Bootstrap
Stylesheet.css - for link and div styles
(Also the fonts folder if you want it to look nice)

Uses the http://rdf-translator.appspot.com/ API for data parsing. 

The properties which are shown in links are the following: 

var properties = ["rdfs:range", "rdfs:domain", "rdf:type", "rdfs:subClassOf", "rdfs:subPropertyOf", "rdfs:subPropertyOf",  "owl:equivalentClass", "rdfs:subClassOf", "owl:disjointWith", "owl:complementOf", "owl:unionOf", "owl:intersectionOf", "owl:equivalentProperty", "owl:inverseOf", "owl:sameAs", "owl:differentFrom", "owl:AllDifferent"];

Properties can be added to this array and be tracked and displayed without any extra code. 

