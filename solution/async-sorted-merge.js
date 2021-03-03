"use strict";
var Heap = require('heap');


// Print all entries, across all of the *async* sources, in chronological order.

module.exports = (logSources, printer) => {
  return new Promise((resolve, reject) => {
    //set to determine which sources contain entries
    var logsFull=new Set();
    //rough maximum size of heap we allow
    const maxHeapSize=10000000;
    //burstsize of async calls when heap is
    //below max size
    const burstSize=50;
    //heap structure used for entry ordering
    var heap = new Heap(function(a, b) {
      return a.date - b.date;
    });

    //add first entry of each source to heap
    function getEntries(sourceId, logSource){
      try{
        logSource.popAsync().then(
          function (entry){
            if(entry){
              //add sourceid to elem so it can be traced to source when popped from heap
              entry.sourceId=sourceId;
              heap.push(entry);
              logsFull.add(sourceId);
              //once all sources have one elem in heap, start the heap handling process
              if(logsFull.size==logSources.length)
                accessHeap();
            }
          }
        );
      }catch{
        console.log("getEntries function failed for source" + sourceId)
      }
    }


    function accessHeap(){
      //if all entries printed return
      if(heap.size()==0 && logsFull.size==0){
        printer.done();
        console.log("Async sort complete.");
        return
      }
      //pop first entry of heap, i.e smallest date,
      var entry=heap.pop();
      if(!entry){
        return
      }
      var sourceId = entry.sourceId;
      //print entry
      printer.print(entry);
      //chain call the popAsync wrapper to take advantage of asynchronous infrastructure
      //and fill heap, below number can be tweeked for different processing speeds.
      //heap size check to ensure memory constraints are respected. Those numbers can be Set
      //to the system's convenience.
      if(heap.size() < maxHeapSize){
        const sourceOffsets= [...Array(burstSize).keys()]
        Promise.all(
          sourceOffsets.map(i => pullLogSource((sourceId+i)%logSources.length))).then(()=>{});
      }
      //then fetch entry from same source as one popped if possible, and restart heap handling
      //it is very important to fetch from same source as last popped to ensure all logSources
      //are present in heap, otherwise we break chronological order.
      pullLogSource(sourceId).then(()=>{accessHeap();});
    }


    function pullLogSource(sourceId){
      //if no sources to pop from, stop
      if(logsFull.size==0)
        return Promise.resolve();
      //try to pop from source asynchronously
      return logSources[sourceId].popAsync().then(
        function (entry){
          if(entry){
            //add to heap new entry
            entry.sourceId=sourceId;
            heap.push(entry);
            return;
          }else{
            //remove drained source from set, try to find new one
            logsFull.delete(sourceId);
            if(logsFull.size==0)
              return Promise.resolve();
            //run back with new found source
            sourceId = logsFull.values().next().value;
            return pullLogSource(sourceId);
          }
        }
      );
    }

    //get logs from all sources in list in chronological order
    function getAllEntries(){
      for(const [sourceId, logSource] of logSources.entries()){
        getEntries(sourceId, logSource);
      }
    }

    resolve(getAllEntries());

  });
};
