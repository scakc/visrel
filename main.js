/* js file for the periodicity visualization */
// Global variables
var session_data = {};
var timelines = {};
var colormaps = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
var timeline_number = 0;
var timeline_colors = {};
var min_date = null;
var max_date = null;
var gaussians = {};

// on window load, load sessions data
window.onload = function() {
    // load the session data
    loadSessionData();

    // Event listeners definations
    // add event listener for add timeline button
    document.getElementById("addbtn").addEventListener("click", addTimeline);
    // add event listener for clearall button
    document.getElementById("clearall").addEventListener("click", clearAll);
    // add event listener for datePicker
    document.getElementById("datePicker").addEventListener("change", updateMarkers);
    // add event listener for downloadLS button and uploadLS button
    document.getElementById("downloadLS").addEventListener("click", downloadLS);
    document.getElementById("uploadLS").addEventListener("click", uploadLS);
}

// Class definations
// class for a timeline object
class Timeline {
    constructor(name, start, end) {
        this.name = name;
        this.start = start;
        this.end = end;
        this.events = [];
        this.plot = null;
        this.x = null;
    }
}

// Function definations
/* Utility Functions */
// function load session data
function loadSessionData() {
    // load the session data
    session_data = JSON.parse(localStorage.getItem("session_data"));

    if (session_data == null) {
        session_data = {};
    }
    else{
        // add the timelines to the visualization
        for (var key in session_data.timelines) {
            var timeline = jsonToTimeline(session_data.timelines[key]);
            timelines[key] = timeline;
            timeline_colors[key] = colormaps[timeline_number % colormaps.length];
            addTimelinePlot(timeline);
            timeline_number++;
        }

        addPeriodGaussianPlot(timelines);
        addTimeGaussianPlot(timelines);
    }
}

// function to save session data
function saveSessionData() {
    // save the session data
    localStorage.setItem("session_data", JSON.stringify(session_data));
}

// function to convert timeline object to json
function timelineToJSON(timeline) {
    var retval = {};
    retval.name = timeline.name;
    retval.start = momentToDate(timeline.start);
    retval.end = momentToDate(timeline.end);
    retval.events = d3eventsToJSON(timeline.events);

    return retval;
}

// function to convert json to timeline object
function jsonToTimeline(json) {

    var start = dateToMoment(json.start);
    var end = dateToMoment(json.end);

    var timeline = new Timeline(json.name, start, end);
    timeline.events = jsonTod3events(json.events);

    return timeline;
}

// function to convert d3 events to json
function jsonTod3events(events) {
    var eventsJSON = JSON.parse(events);
    var retval = [];
    for (var i = 0; i < eventsJSON.length; i++) {
        var event = eventsJSON[i];
        retval.push({date: d3.timeParse("%Y-%m-%dT%H:%M:%S.%LZ")(event.date), name: event.name});
    }
    return retval;
}

// function to convert d3 events to json
function d3eventsToJSON(events) {
    return JSON.stringify(events);
}

// function to convert date to moment
function dateToMoment(date) {
    ret = moment(date, "DD-MM-YYYY");
    
    // update min and max
    if (min_date == null || ret < min_date) {
        min_date = ret;
    }

    if (max_date == null || ret > max_date) {
        max_date = ret;
        // autoselect the date in datePicker <input type=date> to max date
        document.getElementById("datePicker").value = ret.format("YYYY-MM-DD");
    }

    return ret;
}

// function to convert moment to date
function momentToDate(moment) {
    return moment.format("DD-MM-YYYY")
}

/* Button Functions */
// function to download the local storage data
function downloadLS() {
    var data = JSON.stringify(session_data);
    var blob = new Blob([data], {type: "text/plain"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "session_data.json";
    a.click();
}

// function to upload the local storage data
function uploadLS() {
    var input = document.createElement("input");
    input.type = "file";
    input.onchange = function() {
        var file = input.files[0];
        var reader = new FileReader();
        reader.onload = function() {
            var data = JSON.parse(reader.result);
            session_data = data;
            localStorage.setItem("session_data", JSON.stringify(session_data));
            loadSessionData();
        }
        reader.readAsText(file);
    }
    input.click();
}

// function to clear all the timelines
function clearAll() {
    // clear the session data
    session_data = {};
    // clear the local storage
    localStorage.removeItem("session_data");
    // clear the timeline graph area
    document.getElementById("timelineGraphArea").innerHTML = "";

    console.log("cleared all timelines");
    console.log("session data", session_data);
}

// function to add a timeline
// adds a new timeline plot for visualization using interactive timeline library provided by d3.js
function addTimeline() {
    // get data from user input as popup
    var start_date = prompt("Enter start date (DD-MM-YYYY): ");
    var end_date = prompt("Enter end date (DD-MM-YYYY): ");
    var name = prompt("Enter name of the timeline: ");

    // add the timeline to the session data
    addTimelineWithInput(name, start_date, end_date);
}

// function to delete a timeline
function deleteTimeline(timeline) {
    // remove the timeline from the session data
    delete session_data.timelines[timeline.name];
    delete timelines[timeline.name];
    delete timeline_colors[timeline.name];

    // remove the timeline from the visualization
    var div = document.getElementById(timeline.name);
    div.parentNode.removeChild(div);

    // save the session data
    saveSessionData();
    addPeriodGaussianPlot(timelines);
    addTimeGaussianPlot(timelines);
    console.log("deleted timeline", timeline.name);
}

/* Dynamic Processing Functions */
/* Gaussian Periodicity Plot */
// function to add a timeline with input
function addTimelineWithInput(name, start_date, end_date) {
    // check if the input is valid
    if (start_date == null || end_date == null || name == null) {
        return;
    }

    // parse the date using moment.js
    var start = dateToMoment(start_date);
    var end = dateToMoment(end_date);

    // create a new timeline object
    var timeline = new Timeline(name, start, end);
    timelines[name] = timeline;

    // add the timeline to the session data -> timelines key
    if (session_data.timelines == null) {
        session_data.timelines = {};
    }
    // add the timeline to the session data
    session_data.timelines[name] = timelineToJSON(timeline);

    // add the timeline to the visualization
    addTimelinePlot(timeline);
    timeline_number++;

    // save the session data
    saveSessionData();
    addPeriodGaussianPlot(timelines);
    addTimeGaussianPlot(timelines);
}

// function to add a timeline plot
// adds a new timeline plot for visualization using interactive timeline library provided by d3.js
function addTimelinePlot(timeline) {
    // create a new div for the timeline plot
    var div = document.createElement("div");
    div.id = timeline.name;
    div.className = "timeline";
    document.getElementById("timelineGraphArea").appendChild(div);

    // create a new line plot using d3.js
    var svg = d3.select("#" + timeline.name).append("svg")
        .attr("width", 800)
        .attr("height", 300);

    // console.log("adding timeline plot with start and end", timeline.start, timeline.end);

    // create a new scale for the timeline
    var x = d3.scaleTime()
        .domain([timeline.start, timeline.end])
        .range([0, 800]);

    // create a new axis for the timeline
    var xAxis = d3.axisBottom(x);

    // add the axis to the plot
    svg.append("g")
        .attr("transform", "translate(0, 50)")
        .call(xAxis);

    // if timeline.events is not null, add the events to the plot
    if (timeline.events != null) {
        // console.log("adding events to the timeline", timeline);
        for (var i = 0; i < timeline.events.length; i++) {
            var event = timeline.events[i];
            var date = event.date;

            // convert the date to coordinates
            var coords = x(date);
            // console.log("adding event to the timeline at coords", coords);
            // add a new circle to the plot line only on x-axis
            svg.append("circle")
                .attr("cx", x(date))
                .attr("cy", 50)
                .attr("r", 5)
                .attr("fill", timeline_colors[timeline.name]);
        }
    }

    // on click event for the timeline
    svg.on("click", function() {

        // check if n radio group name="clicksvg" which is checked
        var radios = document.getElementsByName("clicksvg");
        var click = null;
        for (var i = 0; i < radios.length; i++) {
            if (radios[i].checked) {
                click = radios[i].value;
                break;
            }
        }

        var todo = null;
        
        if (click != null && click == 1) {
            todo = "add";
        }
        else if (click != null && click == 2) {
            todo = "move";
        }

        var coords = d3.mouse(this);
        var date = x.invert(coords[0]);

        console.log("clicked on timeline", timeline.name, "at", date);


        if (todo == "add"){
            timeline.events.push({date: date, name: 'click'});
            // add a new circle to the plot line only on x-axis
            console.log("adding events to the timeline at coords", coords);
            svg.append("circle")
                .attr("cx", coords[0])
                .attr("cy", 50)
                .attr("r", 5)
                .attr("fill", timeline_colors[timeline.name]);
        }
        else if (todo == "move") {
            // change the datePicker value to the clicked date
            document.getElementById("datePicker").value = date.toISOString().split('T')[0];
            // update the markers on the timeline
            updateMarkers();
        }

        // save the session data
        session_data.timelines[timeline.name] = timelineToJSON(timeline);
        console.log("saving session data", session_data);

        // update the localStorage with overwrite
        localStorage.setItem("session_data", JSON.stringify(session_data));

        // update the gaussian plot
        addPeriodGaussianPlot(timelines);
        addTimeGaussianPlot(timelines);
    });

    // plot the datePicker on the timeline as a vertical line in format MM-DD-YYYY
    var datePicker = document.getElementById("datePicker");
    var date = moment(datePicker.value, "YYYY-MM-DD");
    var coords = x(date);
    // console.log("datePicker coords", coords, date);
    svg.append("line")
        .attr("x1", coords)
        .attr("y1", 0)
        .attr("x2", coords)
        .attr("y2", 180)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    
    // save the plot to the timeline object
    timeline.plot = svg;
    timeline.x = x;

    // add hover event for the timeline when mouse enters the timeline plot
    // show the date on the x-axis
    svg.on("mousemove", function() {
        
        // delete all divs with class dateDiv
        var divs = document.getElementsByClassName("dateDiv");
        for (var i = 0; i < divs.length; i++) {
            divs[i].parentNode.removeChild(divs[i]);
        }
        
        var coords = d3.mouse(this);
        var date = x.invert(coords[0]);
        // create a new div for the date
        var div = document.createElement("div");
        div.className = "dateDiv";
        div.id = "dateDiv";
        div.className = "dateDiv";
        div.innerHTML = date;
        div.style.left = coords[0] + "px";
        div.style.top = "50px";
        // move up the div to show the date up a bit
        div.style.marginTop = "-200px";
        document.getElementById(timeline.name).appendChild(div);
    });

    svg.on("mouseout", function() {
        // delete all divs with class dateDiv
        var divs = document.getElementsByClassName("dateDiv");
        for (var i = 0; i < divs.length; i++) {
            divs[i].parentNode.removeChild(divs[i]);
        }
    });

    // show the svg element on the page by adding it to the div
    document.getElementById(timeline.name).appendChild(svg.node());

    // add a delete button to the timeline
    var deletebtn = document.createElement("button");
    deletebtn.className = "deleteTLbtn";
    deletebtn.innerHTML = "Delete";
    deletebtn.onclick = function() {
        deleteTimeline(timeline);
    }

    document.getElementById(timeline.name).appendChild(deletebtn);
}

// function to add a gaussian plot on mean and variance of the period per timeline
function addPeriodGaussianPlot(timelines) {

    // check if the timelines is empty
    if (Object.keys(timelines).length == 0) {
        return;
    }

    // get the div for the timeline plot
    var div = document.getElementById("periodicityGraph");

    // empty the div
    div.innerHTML = "";

    var min_period = 1000000000;
    var max_period = 0;
    var timeline_periods = {};
    var deltaLEs = {};
    // for loop over all the timelines to get period range 
    for (var key in timelines) {
        var timeline = timelines[key];
        var periodsanddeltaLE = computePeriods(timeline);
        var periods = periodsanddeltaLE[0];
        var deltaLE = periodsanddeltaLE[1];
        deltaLEs[timeline.name] = deltaLE;
        timeline_periods[timeline.name] = periods;
        console.log("timeline periods", periods, deltaLE);
        var min = d3.min(periods);
        var max = d3.max(periods);
        if (min < min_period) {
            min_period = min;
        }
        if (max > max_period) {
            max_period = max;
        }
    }

    min_period = min_period - 500;
    max_period = max_period + 500;
    console.log("min and max period", min_period, max_period);
    // console.log("timeline periods", timeline_periods);

    // add a line plot for periods as points on the x-axis
    var svg = d3.select("#periodicityGraph").append("svg")
        .attr("width", 800)
        .attr("height", 800);
    
    // create a new scale for the timeline using the min and max period
    var x = d3.scaleLinear()
        .domain([min_period, max_period])
        .range([0, 800]);
    
    var y = d3.scaleLinear()
        .domain([0, 1])
        .range([0, 100]);

    // add the axis to the plot
    var xAxis = d3.axisBottom(x);
    var translateY = 400;
    svg.append("g")
        .attr("transform", "translate(50, " + translateY + ")")
        .call(xAxis);
    
    // add the gaussian plot for the periods
    var counter = 0;
    for (var key in timeline_periods) {
        var periods = timeline_periods[key];
        var mean = d3.mean(periods);
        var variance = d3.variance(periods);

        // add periods as points on the x-axis
        for (var i = 0; i < periods.length; i++) {
            var period = periods[i];
            svg.append("circle")
                .attr("cx", x(period))
                .attr("cy", translateY)
                .attr("r", 5)
                .attr("fill", colormaps[counter % colormaps.length]);
        }

        // add the gaussian plot for the mean and variance
        var step = (max_period - min_period) / 200.0;
        var gaussian = d3.range(min_period, max_period, step).map(function(d) {
            return {x: d, y: gaussianDensity(d, mean, variance)};
        });

        var max_y = d3.max(gaussian, function(d) { return d.y; });
        var multiplier = translateY / max_y;
        // console.log("max y", max_y, gaussian);

        for (var i = 0; i < gaussian.length; i++) {
            var point = gaussian[i];
            svg.append("circle")
                .attr("cx", x(point.x))
                .attr("cy", (400 - 1000*y(point.y)))
                .attr("r", 2)
                .attr("fill", colormaps[counter % colormaps.length]);
        }

        // scale the y-axis to the have max value as max of the gaussian
        var yAxis = d3.axisLeft(y);
        svg.append("g")
            .attr("transform", "translate(50, 400)")
            .call(yAxis);

        // label the axis with axis names
        svg.append("text")
            .attr("x", 370)
            .attr("y", 500)
            .text("Delta Time (Periods)");

        // similar to timline plot add a vertical line for deltaLE
        // make it dashed line
        var deltaLE = deltaLEs[key];
        if (deltaLE != null) {
            var coords = x(deltaLE);
            svg.append("line")
                .attr("x1", coords)
                .attr("y1", 200)
                .attr("x2", coords)
                .attr("y2", 450)
                .attr("stroke", timeline_colors[key])
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5");

            // in the gaussian map add a black circle where this vertical line cuts and mark the value
            var yval = gaussianDensity(deltaLE, mean, variance);
            var ycoords = 400 - 1000*y(yval);
            svg.append("circle")
                .attr("cx", coords)
                .attr("cy", ycoords)
                .attr("r", 5)
                .attr("fill", "black");

            // add a text to show the gaussian score, also translate the label to top
            svg.append("text")
                .attr("x", coords + 5)
                .attr("y", ycoords - 20)
                .text((yval*10000).toFixed(2));
        }
    
        counter++;
    }
    
    // show the svg element on the page by adding it to the div
    div.appendChild(svg.node());
}

function gaussianDensity(x, mean, variance) {
    const stdev = Math.sqrt(variance);
    const exponent = -((x - mean) ** 2) / (2 * stdev ** 2);
    const coefficient = 1 / (stdev * Math.sqrt(2 * Math.PI));
    return coefficient * Math.exp(exponent);
}

// function to compute the periods for the timeline
function computePeriods(timeline) {
    // compute the periods for the timeline
    var periods = [];
    var deltaDatePickerFromLastEvent = null;

    // get the marker for the datePicker
    var datePicker = document.getElementById("datePicker");
    var date = moment(datePicker.value, "YYYY-MM-DD");

    var sorted_events = timeline.events.sort(function(a, b) {
        return a.date - b.date;
    });

    // console.log("sorted events", sorted_events);

    for (var i = 0; i < sorted_events.length - 1; i++) {
        var event1 = sorted_events[i];
        var event2 = sorted_events[i + 1];

        var period = event2.date - event1.date;
        var periodInHours = period / 3600000;

        // get the delta time from the last event to the datePicker
        // if the delta is positive then the datePicker is ahead of the last event
        // if the delta is negative then the datePicker is behind the last event
        // if date is not null
        if (date != null) {
            if (i == sorted_events.length - 2 && date > event2.date) {
                deltaDatePickerFromLastEvent = date - event2.date;            
                periods.push(periodInHours);
            }
            else if (i <= sorted_events.length - 2 && date > event1.date) {
                deltaDatePickerFromLastEvent = date - event1.date;            
                periods.push(periodInHours);
            }
            else{
                ; // do nothing
            }
        }
        else{        
            periods.push(periodInHours);
        }
    }

    console.log("periods", periods);

    return [periods, deltaDatePickerFromLastEvent/3600000];
}

// function to update the markers on the timeline
function updateMarkers() {
    // get the date from the datePicker
    var datePicker = document.getElementById("datePicker");
    var date = moment(datePicker.value, "YYYY-MM-DD");

    // update the markers on the timeline
    for (var key in timelines) {
        var timeline = timelines[key];
        var x = timeline.x;

        // get the svg element for the timeline
        var svg = timeline.plot;

        // remove the existing line
        svg.selectAll("line").remove();

        // plot the datePicker on the timeline as a vertical line in format MM-DD-YYYY
        var coords = x(date);
        // console.log("datePicker coords", coords, date);
        svg.append("line")
            .attr("x1", coords)
            .attr("y1", 0)
            .attr("x2", coords)
            .attr("y2", 180)
            .attr("stroke", "black")
            .attr("stroke-width", 1);
    }

    // update the gaussian plot
    addPeriodGaussianPlot(timelines);
    addTimeGaussianPlot(timelines);
}

/* Gaussian Direct TimeStamping Functions */
// function to add gaussian plot for direct time stamping
function addTimeGaussianPlot(timelines){
    // check if the timelines is empty
    if (Object.keys(timelines).length == 0) {
        return;
    }

    // get the div for the timeline plot
    var div = document.getElementById("decayGraphArea");

    // empty the div
    div.innerHTML = "";

    var svg = d3.select("#decayGraphArea").append("svg")
        .attr("width", 800)
        .attr("height", 800);

    // convert min and max date to date scale usable by d3
    var min_time = min_date.toDate();
    var max_time = max_date.toDate();

    // create a new scale for the timeline using the min and max period
    var x = d3.scaleTime()
        .domain([min_time, max_time])
        .range([0, 800]);
    
    var y = d3.scaleLinear()
        .domain([0, 1])
        .range([0, 100]);

    // add the axis to the plot
    var xAxis = d3.axisBottom(x);
    var translateY = 400;
    svg.append("g")
        .attr("transform", "translate(50, " + translateY + ")")
        .call(xAxis);
    
    // add the gaussian plot for the time stamps for each respective timeline
    var counter = 0;
    for (var key in timelines) {
        var timeline = timelines[key];
        
        // compute mean and variance for the timeline mean (sum of all events divided by number of events)
        var meanVarianceEvents = computeMeanVarianceEvents(timeline);
        var mean = meanVarianceEvents[0];
        var variance = meanVarianceEvents[1];
        var events = meanVarianceEvents[2];

        // add events as points on the x-axis
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            svg.append("circle")
                .attr("cx", x(event.date))
                .attr("cy", translateY)
                .attr("r", 5)
                .attr("fill", timeline_colors[key]);
        }

        // add the gaussian plot for the mean and variance
        var step = (max_time - min_time) / 200.0;
        var gaussian = d3.range(min_time, max_time, step).map(function(d) {
            return {x: d, y: gaussianDensity(d, mean, variance)};
        });

        var max_y = d3.max(gaussian, function(d) { return d.y; });
        var multiplier = translateY / max_y;
        console.log("max y", max_y, gaussian);

        for (var i = 0; i < gaussian.length; i++) {
            var point = gaussian[i];
            svg.append("circle")
                .attr("cx", x(point.x))
                .attr("cy", (400 - 5*10e9*y(point.y)))
                .attr("r", 2)
                .attr("fill", timeline_colors[key]);
        }

        // scale the y-axis to the have max value as max of the gaussian
        var yAxis = d3.axisLeft(y);
        svg.append("g")
            .attr("transform", "translate(50, 400)")
            .call(yAxis);

        // label the axis with axis names
        svg.append("text")
            .attr("x", 370)
            .attr("y", 500)
            .text("Time");

        // add the date marker for the datePicker
        var datePicker = document.getElementById("datePicker");
        var date = moment(datePicker.value, "YYYY-MM-DD");

        var coords = x(date.toDate());
        svg.append("line")
            .attr("x1", coords)
            .attr("y1", 0)
            .attr("x2", coords)
            .attr("y2", 200)
            .attr("transform", "translate(0, 200)")
            .attr("stroke", "black")
            .attr("stroke-width", 1);
        
        counter++;
    }

    // show the svg element on the page by adding it to the div
    div.appendChild(svg.node());
}

// function to compute mean, variance with respect to events below the datePicker
function computeMeanVarianceEvents(timeline) {
    // get the date from the datePicker
    var datePicker = document.getElementById("datePicker");
    var date = moment(datePicker.value, "YYYY-MM-DD");

    // get the events below the datePicker
    var events = [];
    for (var i = 0; i < timeline.events.length; i++) {
        var event = timeline.events[i];
        if (event.date < date) {
            events.push(event.date);
        }
    }

    // compute the mean and variance for the events
    var mean = d3.mean(events);
    var variance = d3.variance(events);

    return [mean, variance, events];
}