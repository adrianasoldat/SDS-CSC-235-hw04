const svg = d3.select('#networkSvg');
const g = svg.append('g');
let fullData = null;
let simulation = null;

// Load data
d3.csv('book1.csv').then(data => {
    const nodes = new Map();
    const links = [];

    data.forEach(row => {
        const source = row.Source;
        const target = row.Target;
        const weight = parseInt(row.weight);

        if (!nodes.has(source)) nodes.set(source, { id: source, degree: 0 });
        if (!nodes.has(target)) nodes.set(target, { id: target, degree: 0 });

        nodes.get(source).degree++;
        nodes.get(target).degree++;

        links.push({ source, target, weight });
    });

    fullData = {
        nodes: Array.from(nodes.values()),
        links: links
    };

    draw(fullData);
    setupEvents();
});

// Draw network
function draw(data) {
    g.selectAll('*').remove();

    const colorScale = d3.scaleLinear()
        .domain([0, d3.max(data.nodes, d => d.degree)])
        .range(['#999', '#0f0']);

    simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(50))
        .force('charge', d3.forceManyBody().strength(-150))
        .force('center', d3.forceCenter(400, 300));

    // Links
    const link = g.append('g').selectAll('line')
        .data(data.links)
        .enter().append('line')
        .attr('stroke', '#ccc')
        .attr('stroke-width', d => Math.sqrt(d.weight) / 3);

    // Nodes
    const node = g.append('g').selectAll('circle')
        .data(data.nodes)
        .enter().append('circle')
        .attr('r', d => 4 + Math.sqrt(d.degree))
        .attr('fill', d => colorScale(d.degree))
        .on('click', (e, d) => showDetails(d, data))
        .call(d3.drag()
            .on('start', e => {
                if (!e.active) simulation.alphaTarget(0.3).restart();
                e.subject.fx = e.subject.x;
                e.subject.fy = e.subject.y;
            })
            .on('drag', e => {
                e.subject.fx = e.x;
                e.subject.fy = e.y;
            })
            .on('end', e => {
                if (!e.active) simulation.alphaTarget(0);
                e.subject.fx = null;
                e.subject.fy = null;
            }));

    // Labels
    const labels = g.append('g').selectAll('text')
        .data(data.nodes)
        .enter().append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .attr('font-size', '9px')
        .attr('fill', '#000')
        .attr('pointer-events', 'none')
        .text(d => d.id.split('-')[0].substring(0, 2));

    simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        node.attr('cx', d => d.x).attr('cy', d => d.y);
        labels.attr('x', d => d.x).attr('y', d => d.y);
    });
}

// Show node details
function showDetails(node, data) {
    const connections = data.links.filter(l =>
        l.source.id === node.id || l.target.id === node.id
    );

    let html = `<strong>${node.id}</strong><br>Connections: ${node.degree}<br><br>`;
    connections.sort((a, b) => b.weight - a.weight).slice(0, 3).forEach(c => {
        const other = c.source.id === node.id ? c.target.id : c.source.id;
        html += `${other} (${c.weight})<br>`;
    });

    document.getElementById('nodeDetails').innerHTML = html;
}

// Setup events
function setupEvents() {
    document.getElementById('weightFilter').addEventListener('change', function(e) {
        const minWeight = parseInt(e.target.value);
        document.getElementById('weightValue').textContent = minWeight;

        const filtered = {
            nodes: fullData.nodes.filter(node =>
                fullData.links.some(l =>
                    (l.source.id === node.id || l.target.id === node.id) && l.weight >= minWeight
                )
            ),
            links: fullData.links.filter(l => l.weight >= minWeight)
        };

        filtered.nodes.forEach(n => {
            n.degree = filtered.links.filter(l =>
                l.source.id === n.id || l.target.id === n.id
            ).length;
        });

        draw(filtered);
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('weightFilter').value = 3;
        document.getElementById('weightValue').textContent = '3';
        document.getElementById('nodeDetails').innerHTML = '<p>Click a node</p>';
        draw(fullData);
    });
}