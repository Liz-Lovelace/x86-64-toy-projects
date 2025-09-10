#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        samples: 1000,
        visualize: false
    };
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--samples' && i + 1 < args.length) {
            options.samples = parseInt(args[i + 1], 10);
            i++; // Skip next argument as it's the value
        } else if (args[i] === '--visualize') {
            options.visualize = true;
        }
    }
    
    return options;
}

// Perlin noise implementation
class PerlinNoise {
    constructor(seed = null) {
        // Permutation table
        this.p = [];
        
        // Generate permutation table
        const perm = [];
        for (let i = 0; i < 256; i++) {
            perm[i] = i;
        }
        
        // Shuffle using seed or random
        const random = seed ? this.seededRandom(seed) : Math.random;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        
        // Duplicate the permutation table
        for (let i = 0; i < 512; i++) {
            this.p[i] = perm[i % 256];
        }
    }
    
    // Simple seeded random number generator
    seededRandom(seed) {
        let state = seed;
        return function() {
            state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
            return state / Math.pow(2, 32);
        };
    }
    
    // Fade function for smooth interpolation
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    // Linear interpolation
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    // Gradient function
    grad(hash, x) {
        // Convert low bits of hash to gradient direction
        const h = hash & 1;
        return h === 0 ? x : -x;
    }
    
    // 1D Perlin noise
    noise(x) {
        // Find the unit square that contains the point
        const X = Math.floor(x) & 255;
        
        // Find relative x of point in square
        x -= Math.floor(x);
        
        // Compute fade curve for x
        const u = this.fade(x);
        
        // Hash coordinates of the square corners
        const a = this.p[X];
        const b = this.p[X + 1];
        
        // Calculate noise value
        return this.lerp(
            this.grad(this.p[a], x),
            this.grad(this.p[b], x - 1),
            u
        );
    }
    
    // Multi-octave Perlin noise for more detail
    octaveNoise(x, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0; // Used for normalizing result to [-1,1]
        
        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        return value / maxValue;
    }
}

// Generate noise data and save to binary file
function generateNoiseFile(numSamples) {
    console.log(`Generating ${numSamples} samples of Perlin noise...`);
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Create Perlin noise generator
    const perlin = new PerlinNoise(12345); // Fixed seed for reproducible results
    
    // Generate noise samples
    const buffer = Buffer.allocUnsafe(numSamples * 4); // 4 bytes per 32-bit integer
    
    // Scale factor for the noise input (smaller = smoother, larger = more detail)
    const scale = 0.005;
    
    // Multi-octave parameters for layered detail
    const octaves = 7;        // Number of noise layers
    const persistence = 0.6;  // How much each octave contributes (0.5 = each halves)
    const lacunarity = 2.1;   // Frequency multiplier between octaves
    
    // Constants for converting to 32-bit unsigned integers
    const maxUint32 = 4294967295; // 2^32 - 1
    
    for (let i = 0; i < numSamples; i++) {
        const noise = perlin.octaveNoise(i * scale, octaves, persistence, lacunarity);
        
        // Convert from [-1.0, 1.0] to [0, 2^32-1]
        // First normalize to [0, 1.0], then scale to full 32-bit range
        const normalized = (noise + 1.0) / 2.0;
        const scaledValue = Math.floor(normalized * maxUint32);
        
        buffer.writeUInt32LE(scaledValue, i * 4); // Little-endian 32-bit unsigned integer
    }
    
    // Write to file
    const filePath = path.join(dataDir, 'noise.bin');
    fs.writeFileSync(filePath, buffer);
    console.log(`Noise data saved to ${filePath}`);
    
    return filePath;
}

// Read binary data for visualization
function readNoiseFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    const numSamples = buffer.length / 4;
    const data = [];
    
    // Constants for converting back from 32-bit unsigned integers
    const maxUint32 = 4294967295; // 2^32 - 1
    
    for (let i = 0; i < numSamples; i++) {
        const uint32Value = buffer.readUInt32LE(i * 4);
        
        // Convert back from [0, 2^32-1] to [-1.0, 1.0] for visualization
        const normalized = uint32Value / maxUint32;
        const noise = (normalized * 2.0) - 1.0;
        
        data.push(noise);
    }
    
    return data;
}

// Create HTML page for visualization
function createVisualizationHTML(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Perlin Noise Visualization</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .stat {
            text-align: center;
        }
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #007bff;
        }
        .chart-container {
            margin: 20px 0;
            height: 400px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Perlin Noise Visualization</h1>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value" id="sampleCount">${data.length}</div>
                <div>Samples</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="mean">0.00</div>
                <div>Mean</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="stddev">1.00</div>
                <div>Std Dev</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="minVal">0.00</div>
                <div>Min</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="maxVal">0.00</div>
                <div>Max</div>
            </div>
        </div>
        
        <div class="chart-container">
            <canvas id="timeSeriesChart"></canvas>
        </div>
        
        <div class="chart-container">
            <canvas id="histogramChart"></canvas>
        </div>
    </div>

    <script>
        const data = ${JSON.stringify(data)};
        
        // Calculate statistics
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
        const stddev = Math.sqrt(variance);
        const min = Math.min(...data);
        const max = Math.max(...data);
        
        // Update stats display
        document.getElementById('mean').textContent = mean.toFixed(3);
        document.getElementById('stddev').textContent = stddev.toFixed(3);
        document.getElementById('minVal').textContent = min.toFixed(3);
        document.getElementById('maxVal').textContent = max.toFixed(3);
        
        // Time series chart
        const timeCtx = document.getElementById('timeSeriesChart').getContext('2d');
        new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    label: 'Perlin Noise',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Time Series View'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Sample Index'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    }
                }
            }
        });
        
        // Histogram
        const binCount = 50;
        const binWidth = (max - min) / binCount;
        const bins = new Array(binCount).fill(0);
        const binLabels = [];
        
        for (let i = 0; i < binCount; i++) {
            binLabels.push((min + i * binWidth).toFixed(2));
        }
        
        data.forEach(value => {
            const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
            bins[binIndex]++;
        });
        
        const histCtx = document.getElementById('histogramChart').getContext('2d');
        new Chart(histCtx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: 'Frequency',
                    data: bins,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Histogram Distribution'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Value'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
}

// Start HTTP server for visualization
function startVisualizationServer(data) {
    const server = http.createServer((req, res) => {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(createVisualizationHTML(data));
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
        }
    });
    
    const port = 3000;
    server.listen(port, () => {
        console.log(`Visualization server started at http://localhost:${port}`);
        console.log('Opening browser...');
        
        // Open browser (cross-platform)
        const command = process.platform === 'win32' ? 'start' :
                       process.platform === 'darwin' ? 'open' : 'xdg-open';
        
        exec(`${command} http://localhost:${port}`, (error) => {
            if (error) {
                console.log('Could not automatically open browser. Please navigate to http://localhost:3000');
            }
        });
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\nShutting down server...');
        server.close(() => {
            process.exit(0);
        });
    });
}

// Main function
function main() {
    const options = parseArgs();
    
    if (options.samples <= 0) {
        console.error('Error: --samples must be a positive integer');
        process.exit(1);
    }
    
    console.log(`Options: samples=${options.samples}, visualize=${options.visualize}`);
    
    // Generate noise file
    const filePath = generateNoiseFile(options.samples);
    
    // If visualization is requested, start server
    if (options.visualize) {
        const data = readNoiseFile(filePath);
        startVisualizationServer(data);
    } else {
        console.log('Done. Use --visualize to see the data in a browser.');
    }
}

// Run if this script is called directly
if (require.main === module) {
    main();
}
