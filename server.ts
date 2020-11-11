import 'zone.js/dist/zone-node';

import {ngExpressEngine} from '@nguniversal/express-engine';
import express from 'express';
import {join} from 'path';

import {AppServerModule} from './src/main.server';
import {APP_BASE_HREF} from '@angular/common';
import {existsSync} from 'fs';

const spdy = require('spdy');
const mime = require('mime');
// const http2 = require('http2');
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio');


const STATIC = path.join(process.cwd(), 'dist/sb-admin-angular/browser');

const dashbord=[
    'default~modules-auth-auth-routing-module-ngfactory~modules-charts-charts-routing-module-ngfactory~mo~ac8df2c5-es2015.6662228bd1748a1dae90.js',
    'default~modules-charts-charts-routing-module-ngfactory~modules-dashboard-dashboard-routing-module-ng~83d1622b-es2015.5a4f7e6ccfc29e652472.js',
    'default~modules-charts-charts-routing-module-ngfactory~modules-dashboard-dashboard-routing-module-ngfactory-es2015.c77593c83ee5ea2ed681.js',
    'default~modules-dashboard-dashboard-routing-module-ngfactory~modules-tables-tables-routing-module-ngfactory-es2015.80bcff1c99fc8e7c74a2.js',
    'modules-dashboard-dashboard-routing-module-ngfactory-es2015.edab2735c862a1becc3b.js',
    'styles.493eeecc96b743a8ffd8.css'
]
// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
    const server = express();
    const distFolder = join(process.cwd(), 'dist/sb-admin-angular/browser');
    const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

    // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
    server.engine('html', ngExpressEngine({
        bootstrap: AppServerModule,
    }));

    server.set('view engine', 'html');
    server.set('views', distFolder);

    // Example Express Rest API endpoints
    // server.get('/api/**', (req, res) => { });
    // Serve static files from /browser
    server.get('*.*', express.static(distFolder, {
        maxAge: '1y'
    }));

    // All regular routes use the Universal engine
    server.get('*', (req, res) => {
        res.render(indexHtml,
            {
                req,
                providers: [{provide: APP_BASE_HREF, useValue: req.baseUrl}]
            },
            (err, html) => {
                if (err) {
                    res.end(err.message);
                    return;
                }

                const $ = cheerio.load(html);
                const scripts = Array.from($('script')).map((i: any) => i.attribs.src) || [];
                const css = Array.from($('css')).map((i: any) => i.attribs.href) || [];
                // const img = Array.from($('img')).map((i:any)=>i.attribs.src)

                const pushfiles = [...scripts, ...css, ...dashbord];
                // @ts-ignore
                Promise.all(pushFiles(res, pushfiles)) // @ts-ignore
                    .then(() => {
                        res.end(html) ;
                        console.log('files pushed', pushfiles)
                    });
                // res.end(html);
            });//


    });

    return server;
}

function run(): void {
    const port = process.env.PORT || 4000;

    // Start up the Node server
    const expressApp = app();
    // server.listen(port, () => {
    //   console.log(`Node Express server listening on http://localhost:${port}`);
    // });

    // http2
    //   .createSecureServer({
    //     key: fs.readFileSync("localhost-private.pem"),
    //     cert: fs.readFileSync("localhost-cert.pem")
    //   }, expressApp)
    //   .listen(port, (err) => {
    //     if (err) {
    //       throw new Error(err);
    //     }
    //
    //     /* eslint-disable no-console */
    //     console.log(`Listening on port: ${port}.`);
    //     /* eslint-enable no-console */
    //   });

    spdy
        .createServer({
            key: fs.readFileSync("localhost-private.pem"),
            cert: fs.readFileSync("localhost-cert.pem")
        }, expressApp)
        .listen(port, (err) => {
            if (err) {
                throw new Error(err);
            }

            /* eslint-disable no-console */
            console.log('Listening on port: ' + port + '.');
            console.log('https://localhost:' + port + '');
            /* eslint-enable no-console */
        });


}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
    run();
}

export * from './src/main.server';

const pushFiles = (response, files = []) => {
    // push defualt files //
    return files
        .map((fileToPush) => {
            let fileToPushPath = path.join(STATIC, fileToPush)
            return new Promise((resolve, rej) => {
                fs.readFile(fileToPushPath, (error, data) => {
                    if (error) return rej(error)
                    console.log('Will push: ', fileToPush, fileToPushPath)
                    try {
                        const stream = response.push(`/${fileToPush}`, {
                            status: 200,
                            request: {
                                accept: '*/*'
                            },
                            response: {
                                'content-type': mime.getType(fileToPush)
                            }
                        });
                        stream.end(data)
                        resolve()
                    } catch (e) {
                        rej(e);
                    }
                })
            })
        });
}


// read and send file content in the stream
const sendFile = (stream, fileName) => {
    const fd = fs.openSync(fileName, "r");
    const stat = fs.fstatSync(fd);
    const headers = {
        "content-length": stat.size,
        "last-modified": stat.mtime.toUTCString(),
        "content-type": mime.getType(fileName)
    };
    stream.respondWithFD(fd, headers);
    stream.on("close", () => {
        console.log("closing file", fileName);
        fs.closeSync(fd);
    });
    stream.end();
};

const pushFile = (stream, path, fileName) => {
    stream.pushStream({ ":path": path }, (err, pushStream) => {
        if (err) {
            throw err;
        }
        sendFile(pushStream, fileName);
    });
};
//https://medium.com/@sibu.it13/an-example-of-server-push-with-http-2-in-node-js-22757256f0b3
