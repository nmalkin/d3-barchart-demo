(function() {
"use strict";

/*** SET UP SCREEN ***********************************************************/
// Constants
var BAR_HEIGHT = 20,            // the height of a bar in the main view
    CONTEXT_BAR_HEIGHT = 2,     // the height of a bar in the context view
    CONTEXT_VIEW_WIDTH = 150,   // the width of the context view
    PADDING_RIGHT = 100,        // padding between main view and context view
    PADDING_BOTTOM = 150        // vertical padding
;

// Establish the dimensions of the main chart.
// (It takes up all the empty horizontal and vertical space in the window.)
var MAIN_VIEW_WIDTH = window.innerWidth - CONTEXT_VIEW_WIDTH - PADDING_RIGHT,
    MAIN_VIEW_HEIGHT = window.innerHeight - PADDING_BOTTOM;
// Apply these dimensions to the container element
d3.select('#main')
    .style('width', MAIN_VIEW_WIDTH + 'px')
    .style('height', MAIN_VIEW_HEIGHT + 'px');
d3.select('#context')
    .style('height', MAIN_VIEW_HEIGHT + 'px');

// The screen dimension tell us how many bars will fit on screen in the main chart.
var barsOnScreen = Math.floor(MAIN_VIEW_HEIGHT / BAR_HEIGHT),
// This in turn determines the size of the viewport
// (the draggable window in the context view).
    VIEWPORT_HEIGHT = CONTEXT_BAR_HEIGHT * barsOnScreen;

// At the beginning, we will display the first <barsOnScreen> cities.
var activeLow = 0,
    activeHigh = barsOnScreen;


/*** PROCESS DATA ************************************************************/
// Extract the cities from the full dataset.
var rawCities = data.reduce(function(previous, current) {
    return (current.name == 'City') ? current.values : previous;
}, null);

// Count the number of times each city occurs in the list.
var frequencies = d3.map();
rawCities.forEach(function(city) {
    var count = 0;
    if(frequencies.has(city)) count = frequencies.get(city);
    frequencies.set(city, 1 + count);
});

// Convert the cities to an array with objects of the form:
//    {key: 'city name', value: <count>}
var allCities = frequencies.entries();

// Now that we know all our cities, we know how big the context view is.
var CONTEXT_VIEW_HEIGHT = allCities.length * CONTEXT_BAR_HEIGHT;

// Select the cities that will be displayed on the screen.
var activeCities = allCities.slice(activeLow, activeHigh);


/*** DISPLAY MAIN CHART ******************************************************/

// Create the SVG element that will hold the bars
var chart = d3.select('#main').append('svg')
    .attr('class', 'chart')
    .attr('width', MAIN_VIEW_WIDTH)
    .attr('height', MAIN_VIEW_HEIGHT);

// Use a linear scale to compute bar width
var width = d3.scale.linear()
    .domain([0, d3.max(allCities, function(d) { return d.value; })])
    .range([0, MAIN_VIEW_WIDTH]);

// Set up bars
var bars = chart.selectAll('rect').data(activeCities, function(d) { return d.key; });
bars.enter().append('rect')
        .attr('class', 'bar')
        .attr('y', function(d,i) { return i * BAR_HEIGHT; })
        .attr('width', function(d) { return width(d.value); })
        .attr('height', BAR_HEIGHT);
bars.exit().remove();

// Add labels
var labels = chart.selectAll("text").data(activeCities, function(d) { return d.key; });
labels.enter().append("text")
    .attr("y", function(d, i) { return i * BAR_HEIGHT; })
    .attr('dx', function(d) { return width(d.value) + 5; }) // position text after bar
    .attr("dy", 13) // centers text vertically
    .attr("text-anchor", "start")
    .text(function(d) { return d.key; });
labels.exit().remove();


/*** DISPLAY CONTEXT CHART ***************************************************/

// Create the SVG element that will hold the bars
var context = d3.select('#context').append('svg')
    .attr('class', 'chart context')
    .attr('height', CONTEXT_VIEW_HEIGHT)
    .attr('width', CONTEXT_VIEW_WIDTH);

// Use a linear scale to compute bar width
var contextWidth = d3.scale.linear()
    .domain([0, d3.max(allCities, function(d) { return d.value; })])
    .range([0, CONTEXT_VIEW_WIDTH]);

// Set up bars
context.selectAll("rect")
    .data(allCities)
    .enter().append("rect")
    .attr('class', 'bar')
    .attr('y', function(d,i) { return i * CONTEXT_BAR_HEIGHT; })
    .attr('width', function(d) { return contextWidth(d.value); })
    .attr('height', CONTEXT_BAR_HEIGHT);


/*** FILTER BARS BY USER INPUT ***********************************************/
var filter = document.getElementById('filter');

// Redraws main chart based on current filter value
var applyFilter = function() {
    var filterValue = new RegExp(filter.value, 'i');

    // Force empty string to test as false
    if(filter.value == '') filterValue.test = function() { return false; };

    activeCities.forEach(function(city) {
        city.selected = filterValue.test(city.key);
    });

    // Style active cities based on whether or not they're selected
    chart.selectAll('rect').data(activeCities)
        .attr('class', function(d) {
            return d.selected ? 'bar selected' : 'bar';
        });
};

filter.onkeyup = function(e) {
    applyFilter();
};

applyFilter();


/*** VIEWPORT ****************************************************************/
var viewport;

// Update viewport and main view when viewport is moved
var dragmove = function() {
    // Establish the new position of the viewport
    // (makes sure it's within bounds)
    var y = d3.event.y;
    y = Math.max(y, 0);
    y = Math.min(y, CONTEXT_VIEW_HEIGHT - VIEWPORT_HEIGHT);

    // Move the viewport
    viewport.attr('y', y);

    // Determine which cities are within the viewport range
    activeLow = parseInt(y / CONTEXT_BAR_HEIGHT);
    activeHigh = parseInt((y + VIEWPORT_HEIGHT) / CONTEXT_BAR_HEIGHT);
    activeCities = allCities.slice(activeLow, activeHigh);

    // Update bar chart with newly active cities
    chart.selectAll('rect').data(activeCities)
        .attr('width', function(d) { return width(d.value); });

    // ...and the labels for them
    chart.selectAll("text").data(activeCities)
        .attr('dx', function(d) { return width(d.value) + 5; })
        .text(function(d) { return d.key; });

    // Make sure we're still filtering them too
    applyFilter();
};

// Establish drag behavior
var drag = d3.behavior.drag()
    // Offset x, y values based on viewport position
    // (avoids jumps based on where in the viewport you clicked when dragging)
    .origin(function() {
        return {
            x: viewport.attr('x'),
            y: viewport.attr('y')
        };    
    })
    .on("drag", dragmove);

// Create viewport element (a rectangle overlayed in the context view)
// and enable its drag behavior
viewport = context.append('rect')
    .attr('class', 'viewport')
    .attr('width', '100%')
    .attr('height', VIEWPORT_HEIGHT)
    .call(drag);


})();
