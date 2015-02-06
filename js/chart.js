function chartM(data, arch) {
	document.getElementById("chartContainer").innerHTML = "";
	var g_arch = arch;
	var series, area, areaTransition, areaOverview, areaOverviewTransition, mainSelection, overviewSelection;

	var margin         = {top: 30, right: 30, bottom: 120, left: 50},
		width          = document.getElementById("chartContainer").offsetWidth - margin.left - margin.right,
		height         = 540 - margin.top - margin.bottom,
		marginOverview = {top: 450, right: margin.right, bottom: 50, left: margin.left},
		heightOverview = 540 - marginOverview.top - marginOverview.bottom;
	var marginArch = {top: 0, right: 30, bottom: 0, left: 30},
		widthArch  = 210 - marginArch.left - marginArch.right,
		heightArch = 210 - margin.top - margin.bottom
	var moveDuration   = 2000;
	var deleteDuration = 1000;
	
	var x         = d3.time.scale().range([0, width]);
	var xOverview = d3.time.scale().range([0, width]);
	var y         = d3.scale.linear().range([height, 0]);
	var yOverview = d3.scale.linear().range([heightOverview, 0]);

	var stack = d3.layout.stack()
				.values(function(d){return d.values;})
				.x(function(d){return d[0];})
				.y(function(d){return d[1];});
	
	var xAxis = d3.svg.axis()
			    .scale(x)
			    .orient("bottom");
	var yAxis = d3.svg.axis()
			    .scale(y)
			    .orient("left");
	var xAxisOverview = d3.svg.axis()
			    .scale(xOverview)
			    .orient("bottom");

	var brush = d3.svg.brush()
				.x(xOverview)
				.y(yOverview)
				.on("brush", brushed);
	
	var svg = d3.select("#chartContainer").append("svg:svg")
				.attr("id", "chart")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom);

	var title = svg.append("text")
					.attr("class", "cTitle")
					.attr("id", "chartTitle")
					.attr("text-anchor", "middle")
					.attr("y", "1em");
	var subtitle1 = svg.append("text")
					.attr("class", "cTitle")
					.attr("id", "chartSubTitle1")
					.attr("x","5px")
					.attr("y", height + margin.top + margin.bottom -2)
					.attr("dy","-1em");
	var subtitle2 = svg.append("text")
					.attr("class", "cTitle")
					.attr("id", "chartSubTitle2")
					.attr("x","5px")
					.attr("y", height + margin.top + margin.bottom -2);

	var clip = svg.append("clipPath")
				.attr("id", "clip")
				.append("rect")
					.attr("width", width)
					.attr("height", height);
	
	var main = svg.append("svg:g")
				.attr("id", "mainChart")
				.attr("class", "main")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		main.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")");
		main.append("g")
				.attr("class", "y axis")
				.append("text")
					.attr("id", "yAxisLegend")
					.attr("transform", "rotate(-90)")
			  		.attr("x", -3)
			  		.attr("y", 6)
			  		.attr("dy", ".71em")
			     	.text("# Machines");
	var mainBody = main.append("g")
					.attr("clip-path", "url(#clip)");
	

	var overview = svg.append("svg:g")
					.attr("id", "overviewChart")
					.attr("class", "overview")
					.attr("transform", "translate(" + marginOverview.left + "," + marginOverview.top + ")");
		overview.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + heightOverview + ")");
		overview.append("g")
					.attr("class", "x brush")
					.call(brush)
					.selectAll("rect")
					.attr("y", -6);
					//.attr("height", heightOverview + 7);
	
	// Draw the x Grid lines
	var gridX = mainBody.append("g")
		.attr("class", "grid")
		.attr("transform", "translate(0," + height + ")");
	
	// Draw the y Grid lines
	var gridY = mainBody.append("g")            
		.attr("class", "grid");
	
	x.domain([new Date(data.time[0]*1000), new Date(data.time[data.time.length - 1]*1000)]);
	xOverview.domain(x.domain());

	main.select(".x.axis").transition().duration(moveDuration).call(xAxis);
	overview.select(".x.axis").transition().duration(moveDuration).call(xAxisOverview);

	chartM.updateChart = renderChart;
	renderChart();

	wWidth = window.innerWidth;
	d3.select(window).on('resize', function(){
		if(window.innerWidth != wWidth) {
			chartM(data, g_arch);
		}
	});

	function renderChart(arch) {
		if(arch === undefined) arch = g_arch;
		g_arch = arch;

		title
			.attr("x", width/2)
			.text("Stats for " + arch);
		subtitle1
			.text(function() {
				return "From: " + new Date(+data.time[0]*1000) +
					   " To: " + new Date(+data.time[data.time.length-1]*1000);
			});
		subtitle2
			.text(function() {
				return "Updated: " + new Date(+data.statTime*1000);
			});

		var displayedSeries = [];
		var form = document.getElementById("form_series");
		for (var i = 0; i < form.elements.length; i++) {
			if(form.elements[i].type == "checkbox") {
				displayedSeries.push(form.elements[i].checked);
			}
		}

		series = stack(data.arch[arch].series.filter(function(d,i) { 
					return displayedSeries[i] ? this : null;
				}).map(function(s) {
					return {"uid":s.uid, "name":s.name,"values":zip(data.time, s.data)};
				}));

		var maxY = d3.max(series,function(kv) {
			return d3.max(kv.values, function(d) {
				return d.y0 + d.y;
			})
		});

		y.domain([0, ceil(maxY, 10)]);
		yOverview.domain(y.domain());

		main.select(".y.axis").transition().duration(moveDuration).call(yAxis);

		gridY.transition().duration(moveDuration).call(make_y_axis()
			.tickSize(-width, 0, 0)
			.tickFormat("")
		);
		gridX.transition().duration(moveDuration).call(make_x_axis()
			.tickSize(-height, 0, 0)
			.tickFormat("")
		);

		defineAreas(update);
		function update() {
			if(mainSelection !== undefined) mainSelection.exit().remove();
			if(overviewSelection !== undefined) overviewSelection.exit().remove();

			//Add main
			mainSelection = mainBody.selectAll(".series").data(series, function(d){return d.uid;});
			mainSeries = mainSelection.enter().append("g")
				.attr("class", "series")
				.attr("id", function(d){return d.uid});
			mainSeries.append("path")
				.attr("class", function(d){return "area " + d.name.replace(/\s+/g, '')})
				.attr("d", function(d){return areaTransition(d.values)});
			//Move main
			mainSelection.selectAll("path")
				.transition()
				.duration(moveDuration)
				.attr("d", function(d){
					for(var i = 0; i<series.length; i++){
						if(series[i].uid === d.uid) {
							return area(series[i].values);
						}
					}
				});
			//Remove main
			mainSelection.exit().selectAll("path").transition().duration(deleteDuration).ease("bounce")
				.attr("d", function(d){return areaTransition(d.values)});
			mainSelection.exit().transition().delay(deleteDuration)
				.remove();

			//Add overview
			overviewSelection = overview.selectAll(".series").data(series, function(d){return d.uid;});
			overviewSeries = overviewSelection.enter().insert("g",".x.brush")
				.attr("class", "series")
				.attr("id", function(d){return d.uid})
			overviewSeries.append("path")
				.attr("class", function(d){return "area " + d.name.replace(/\s+/g, '')})
				.attr("d", function(d){return areaOverviewTransition(d.values)});
			//Move overview
			overviewSelection.selectAll("path")
				.transition()
				.duration(moveDuration)
				.attr("d", function(d){
					for(var i = 0; i<series.length; i++){
						if(series[i].uid === d.uid) {
							return areaOverview(series[i].values);
						}
					}
				});
			//Remove overview
			overviewSelection.exit().selectAll("path").transition().duration(deleteDuration).ease("bounce")
				.attr("d", function(d){return areaOverviewTransition(d.values)});
			overviewSelection.exit().transition().delay(deleteDuration)
				.remove();

			setTimeout(function(){
				brushed();
			}, moveDuration + 200);

		try{
			arcChart.update("arc_tat", data.arch[arch].misc.hused / data.arch["Total"].misc.hused);
			arcChart.update("arc_ja", data.arch[arch].misc.jrap/100, data.arch[arch].misc.jiap/100);
			arcChart.update("arc_jrp", data.arch[arch].misc.jrpp/100);
			arcChart.update("arc_jip", data.arch[arch].misc.jipp/100);
		}catch(e) {}
		
		} //update

	} //renderChart
	
	function brushed() {
		if(mainSelection !== undefined) mainSelection.exit().remove();
		if(overviewSelection !== undefined) overviewSelection.exit().remove();

		x.domain(brush.empty() ? xOverview.domain() : [brush.extent()[0][0], brush.extent()[1][0]]);
		y.domain(brush.empty() ? yOverview.domain() : [brush.extent()[0][1], brush.extent()[1][1]]);

		main.selectAll(".series").selectAll("path")
			.transition().duration(moveDuration/2).ease("bounce")
			.attr("d", function(d){
				for(var i = 0; i<series.length; i++){
					if(series[i].uid === d.uid) {
						return area(series[i].values);
					}
				}
			});

		main.select(".x.axis").transition().duration(moveDuration/2).call(xAxis);
		main.select(".y.axis").transition().duration(moveDuration/2).call(yAxis);

		gridY.transition().duration(moveDuration).call(make_y_axis()
			.tickSize(-width, 0, 0)
			.tickFormat("")
		);
		gridX.transition().duration(moveDuration).call(make_x_axis()
			.tickSize(-height, 0, 0)
			.tickFormat("")
		);
	} //brushed

	function defineAreas(cb) {
		var intType = "step";
		var stacked = document.getElementById("rbs_yes").checked;
		if(stacked) {
			area = d3.svg.area() 
					.interpolate(intType)
				    .x(function(d) {return x(new Date(d[0]*1000));})
					.y0(function(d) {return y(d.y0);})
				    .y1(function(d) {return y(d.y0 + d.y);});
			areaTransition = d3.svg.area() 
					.interpolate(intType)
				    .x(function(d) {return x(new Date(d[0]*1000));})
					.y0(function(d) {return y(0);})
				    .y1(function(d) {return y(0);});
			areaOverview = d3.svg.area() 
					.interpolate(intType)
				    .x(function(d) {return xOverview(new Date(d[0]*1000));})
					.y0(function(d) {return yOverview(d.y0);})
				    .y1(function(d) {return yOverview(d.y0 + d.y);});
			areaOverviewTransition = d3.svg.area() 
					.interpolate(intType)
				    .x(function(d) {return xOverview(new Date(d[0]*1000));})
					.y0(function(d) {return yOverview(0);})
				    .y1(function(d) {return yOverview(0);});
		}
		else {
			area =  d3.svg.area() 
					.interpolate(intType)
				    .x(function(d) {return x(new Date(d[0]*1000));})
					.y0(height)
				    .y1(function(d) {return y(d[1]);});
			areaTransition = d3.svg.area() 
					.interpolate(intType)
				    .x(function(d) {return x(new Date(d[0]*1000));})
					.y0(height)
				    .y1(function(d) {return y(0);});
			areaOverview = d3.svg.area() 
					.interpolate(intType)
				    .x(function(d) {return xOverview(new Date(d[0]*1000));})
					.y0(heightOverview)
				    .y1(function(d) {return yOverview(d[1]);});
			areaOverviewTransition = d3.svg.area() 
					.interpolate(intType)
				    .x(function(d) {return xOverview(new Date(d[0]*1000));})
					.y0(heightOverview)
				    .y1(function(d) {return yOverview(0);});
		}
		cb();
	} //defineAreas

	function ceil(value, ceil) {
		if(value % ceil === 0) {
			return value + ceil;
		}
		else {
			return Math.ceil(value/ceil)*ceil;
		}
	}
	
	function zip() {
	    var args = [].slice.call(arguments);
	    var shortest = args.length==0 ? [] : args.reduce(function(a,b) {
		        return a.length<b.length ? a : b
		    });
	
	    return shortest.map(function(_,i) {
		        return args.map(function(array){return array[i]})
		    });
	} //zip
	
	// Grid line functions
	function make_x_axis() {
		return d3.svg.axis()
			.scale(x)
			.orient("bottom");
	} //make_x_axis
	function make_y_axis() {
			return d3.svg.axis()
			.scale(y)
			.orient("left");
	} //make_y_axis

} //chartM
