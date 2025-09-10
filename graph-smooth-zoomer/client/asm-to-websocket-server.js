import net from 'net';
import fs from 'fs';

const SOCKET_PATH = '/tmp/graph-smooth-client-socket';

// Remove the socket file if it already exists
if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
}

const server = net.createServer((socket) => {
    console.log('Client connected');
    
    let buffer = Buffer.alloc(0);
    
    socket.on('data', (data) => {
        // Append new data to our buffer
        buffer = Buffer.concat([buffer, data]);
        
        // Process complete 4-byte chunks
        while (buffer.length >= 4) {
            // Read 4 bytes as little-endian unsigned 32-bit integer
            const value = buffer.readUInt32LE(0);
            
            // Output in hex format
            console.log(`0x${value.toString(16).padStart(8, '0').toUpperCase()}`);
            
            // Remove the processed 4 bytes from buffer
            buffer = buffer.slice(4);
        }
    });
    
    socket.on('end', () => {
        console.log('Client disconnected');
    });
    
    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

server.listen(SOCKET_PATH, () => {
    console.log(`Server listening on ${SOCKET_PATH}`);
    console.log('Waiting for 4-byte little-endian unsigned integers...');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

// Clean up on exit
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        if (fs.existsSync(SOCKET_PATH)) {
            fs.unlinkSync(SOCKET_PATH);
        }
        process.exit(0);
    });
});
