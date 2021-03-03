"use strict";
var Heap = require('heap');

// Print all entries, across all of the sources, in chronological order.

module.exports = (logSources, printer) => {
  //set to determine which sources contain entries
  //if source id is in set, it is not drained yet
  var logsFull=new Set();
  //heap structure used for entry ordering
  var heap = new Heap(function(a, b) {
    return a.date - b.date;
  });

  //add first entry of each source to heap
  for(const [sourceId, logSource] of logSources.entries()){
    var entry = logSource.pop();
    //add sourceid to elem so it can be traced to source when popped from heap
    entry.sourceId=sourceId;
    heap.push(entry);
    logsFull.add(sourceId);
  }
  //pop first entry of heap, i.e smallest date,
  //then fetch entry from same source as one poped.
  //If source drained, fetch from one of sources in source set
  while(entry=heap.pop()){
      var sourceId = entry.sourceId
      //print entry
      printer.print(entry);
      while(!(entry = logSources[sourceId].pop()) && logsFull.size){
          //source is drained so remove it from set, saves searching time later
          logsFull.delete(sourceId);
          //get next available source
          if(logsFull.size)
            sourceId = logsFull.values().next().value;
      }
      //add new entry to heap
      if(logsFull.size){
        entry.sourceId=sourceId;
        heap.push(entry);
      }
  }
  printer.done();

  return console.log("Sync sort complete.");
};
