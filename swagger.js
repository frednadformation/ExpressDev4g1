const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info : {
        title: "My Express API",
        description: "Documentation",
        version: "1.0",
    },
    host: 'localhost:5000',
};

const outputFile = './swagger-output.json';
const routes = ["app.js"]

swaggerAutogen(outputFile,routes, doc);

