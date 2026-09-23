// Confirm D3 is loaded
console.log("D3 Version:", d3.version);

/** Part 1: Setup */
const margin = { top: 40, right: 30, bottom: 60, left: 30 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// global vars for data and the current user selections
let allData = null; // will hold GeoJSON features
let currentDemographics = ['black']; // array of selected demographics

// color scale
let colorScale;
let geoPath;
let projection;

// for transitions
const t = 750; // ms

// friendly labels for the dropdown and tooltip
const friendlyLabels = {
    total: "Total Population",
    white: "White (Non-Hispanic)",
    black: "Black or African American",
    hispanic: "Hispanic or Latino",
    asian: "Asian",
    native: "American Indian / Alaska Native",
    islander: "Native Hawaiian / Pacific Islander",
    other: "Other Race",
    two_or_more: "Two or More Races"
};

// options array for the checkboxes
const options = ['white', 'black', 'hispanic', 'asian', 'native', 'islander', 'other', 'two_or_more'];

// Create SVG and g
const svgWidth = width + margin.left + margin.right;
const svgHeight = height + margin.top + margin.bottom;
const svg = d3
    .select("#vis")
    .append("svg")
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);


/** Part 2: Skeleton */
function init() {
    d3.json("./data/maryland_demographics.geojson")
        .then(data => {
            // allData will hold the features array
            allData = data.features;

            // Setup map projection fitted to the data (using geoMercator prevents the tilt seen in geoAlbers)
            projection = d3.geoMercator()
                .fitExtent([[10, 10], [width - 10, height - 10]], data);
            
            geoPath = d3.geoPath().projection(projection);

            setupSelector();

            // Initial rendering steps
            updateVis();
            addLegend();
        })
        .catch(error => console.error('Error loading GeoJSON:', error));
}


function setupSelector() {
    const container = d3.select('#demographic_checkboxes');
    
    // Dropdown toggle logic
    d3.select('#dropdown-btn').on('click', function(event) {
        event.stopPropagation();
        const content = d3.select('#dropdown-content');
        content.classed('show', !content.classed('show'));
    });
    
    // Close dropdown when clicking outside
    d3.select('body').on('click', function() {
        d3.select('#dropdown-content').classed('show', false);
    });
    
    // Stop propagation on the content itself to avoid closing when clicking a checkbox
    d3.select('#dropdown-content').on('click', function(event) {
        event.stopPropagation();
    });
    
    options.forEach(opt => {
        const label = container.append('label');
        
        label.append('input')
            .attr('type', 'checkbox')
            .attr('value', opt)
            .property('checked', currentDemographics.includes(opt))
            .on('change', function() {
                if (this.checked) {
                    currentDemographics.push(this.value);
                } else {
                    currentDemographics = currentDemographics.filter(d => d !== this.value);
                }
                
                // Update button text
                const btnText = currentDemographics.length > 0 ? 
                    `Select Demographics (${currentDemographics.length})` : 
                    "Select Demographics...";
                d3.select('#dropdown-btn').text(btnText);
                
                updateVis();
                addLegend();
            });
            
        label.append('span').text(friendlyLabels[opt]);
    });
}


/** Part 3: Visualization Update */
function updateVis() {
    const stateTotalPop = d3.sum(allData, d => d.properties.total_pop);
    
    // Handle empty selection
    if (currentDemographics.length === 0) {
        // Blank map
        d3.select('#summary-text').html(`
            <strong>Statewide Summary:</strong> Maryland's total population is <strong>${stateTotalPop.toLocaleString()}</strong>.<br/>
            <em>Please select a demographic group from the dropdown to view its distribution.</em>
        `);
        d3.select('#asterisk-note').style('display', 'none');
        
        svg.selectAll('.county')
            .data(allData, d => d.properties.name)
            .join('path')
            .transition().duration(t)
            .style('fill', '#f0f0f0');
            
        return; // skip rest
    }

    // Calculate statewide totals for the selected demographics
    const stateDemoCount = d3.sum(allData, county => {
        return d3.sum(currentDemographics, dem => county.properties[`${dem}_count`]);
    });
    const statePct = ((stateDemoCount / stateTotalPop) * 100).toFixed(1);
    
    // Create label list for text
    const selectedLabels = currentDemographics.map(d => friendlyLabels[d]).join(" + ");

    // Update the summary text above the SVG
    d3.select('#summary-text').html(`
        <strong>Statewide Summary:</strong> Maryland's total population is <strong>${stateTotalPop.toLocaleString()}</strong>. 
        There are <strong>${stateDemoCount.toLocaleString()}</strong> people in the selected groups (<em>${selectedLabels}</em>), making up <strong>${statePct}%</strong> of the state's population.
    `);

    // Toggle asterisk note if specific demographics are selected
    const showAsterisk = currentDemographics.includes('other') || currentDemographics.includes('two_or_more');
    if (showAsterisk) {
        d3.select('#asterisk-note')
            .style('display', 'block')
            .html(`<em>* Note: <strong>"Other Race"</strong> refers to respondents who do not identify with any of the Census's predefined racial categories. <strong>"Two or More Races"</strong> refers to individuals who selected two or more predefined racial categories. In this dataset, both categories explicitly exclude individuals of Hispanic/Latino origin.</em>`);
    } else {
        d3.select('#asterisk-note').style('display', 'none');
    }

    // Calculate each county's sum to dynamically set color scale domain
    allData.forEach(d => {
        const cTotal = d.properties.total_pop;
        const cCount = d3.sum(currentDemographics, dem => d.properties[`${dem}_count`]);
        d.current_selected_count = cCount;
        d.current_selected_pct = (cCount / cTotal) * 100;
    });

    const maxPct = d3.max(allData, d => d.current_selected_pct);
    
    // Create sequential color scale using D3 interpolator
    colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, maxPct]);

    // Data join for counties
    svg.selectAll('.county')
        .data(allData, d => d.properties.name) // Use county name as key
        .join(
            function (enter) {
                return enter
                    .append('path')
                    .attr('class', 'county')
                    .attr('d', geoPath)
                    .style('fill', '#f0f0f0') // initial color before transition
                    
                    // Tooltip logic
                    .on('mouseover', function (event, d) {
                        if (currentDemographics.length === 0) return; // Prevent tooltip if none selected
                        const props = d.properties;
                        const name = props.name;
                        const total = props.total_pop.toLocaleString();
                        const count = d.current_selected_count.toLocaleString();
                        const pct = d.current_selected_pct.toFixed(1);

                        const tooltip = d3.select('#tooltip');
                        tooltip.style("display", 'block')
                            .html(`
                                <strong>${name}</strong><br/>
                                Total Population: ${total}<br/>
                                <br/>
                                <strong>Selected Groups</strong><br/>
                                Count: ${count}<br/>
                                Percentage: ${pct}%
                            `);
                        
                        // Prevent overflow off the right side of the screen
                        const tooltipNode = tooltip.node();
                        const tooltipWidth = tooltipNode.offsetWidth;
                        let xPos = event.pageX + 15;
                        if (xPos + tooltipWidth > window.innerWidth) {
                            xPos = event.pageX - tooltipWidth - 15;
                        }

                        tooltip.style("left", xPos + "px")
                            .style("top", (event.pageY - 28) + "px");

                        // Highlight hovered county
                        d3.select(this)
                            .style('stroke', 'black')
                            .style('stroke-width', '2.5px');
                    })
                    .on("mouseout", function (event, d) {
                        d3.select('#tooltip')
                            .style('display', 'none');

                        // Unhighlight
                        d3.select(this)
                            .style('stroke', '#aaa')
                            .style('stroke-width', '1px');
                    })
                    
                    // Transition into the color
                    .transition().duration(t)
                    .style('fill', d => colorScale(d.current_selected_pct));
            },
            function (update) {
                return update
                    .transition().duration(t)
                    .style('fill', d => colorScale(d.current_selected_pct));
            },
            function (exit) {
                return exit.remove();
            }
        );
}


/** Part 4: Dynamic Legend */
function addLegend() {
    // Remove existing legend if any
    svg.selectAll('.legend-group').remove();
    
    // Hide legend if nothing is selected
    if (currentDemographics.length === 0) {
        return;
    }

    const maxPct = d3.max(allData, d => d.current_selected_pct);
    const maxCount = d3.max(allData, d => d.current_selected_count);
    
    // Wider legend so text doesn't overlap
    const legendWidth = 500;
    const legendHeight = 10;
    
    // Create a group for the legend (moved slightly down to accommodate title above)
    const legendGroup = svg.append('g')
        .attr('class', 'legend-group')
        .attr('transform', `translate(${(width - legendWidth) / 2}, ${height + margin.bottom / 2})`);

    // Define a linear gradient
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient");
    
    // 0% stop
    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(0));
        
    // 100% stop
    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(maxPct));

    // Draw the rectangle and fill with gradient
    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#linear-gradient)")
        .style("stroke", "#ccc");

    // Title ABOVE the rectangle
    let titleText = "Selected Groups (% of County Pop.)";
    if (currentDemographics.length === 1) {
        titleText = `${friendlyLabels[currentDemographics[0]]} (% of County Pop.)`;
    } else if (currentDemographics.length > 1) {
        titleText = "Combined Selected Demographics (% of County Pop.)";
    }

    legendGroup.append("text")
        .attr("class", "legend-label")
        .attr("x", legendWidth / 2)
        .attr("y", -8)
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(titleText);

    // Min label BELOW the rectangle
    legendGroup.append("text")
        .attr("class", "legend-label")
        .attr("x", 0)
        .attr("y", legendHeight + 15)
        .style("text-anchor", "start")
        .text("0 (0%)");

    // Max label BELOW the rectangle
    legendGroup.append("text")
        .attr("class", "legend-label")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 15)
        .style("text-anchor", "end")
        .text(`${maxCount.toLocaleString()} (${maxPct.toFixed(1)}%)`);
}

// Load data when page is ready
window.addEventListener('load', init);
