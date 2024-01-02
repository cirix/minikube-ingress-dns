// noinspection NpmUsedModulesInstalled
const request = require('request');
const dns2 = require('dns2');
const Packet = require('dns2').Packet;
const k8s = require('@kubernetes/client-node');
const _ = require('lodash');
const {createServer} = require("dns2/server");
const dns = require("dns");

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const opts = {};
kc.applyToRequest(opts);

console.debug(JSON.stringify(opts));
console.debug('Environment: ' + JSON.stringify(process.env));

const dnsPort = parseInt(process.env.DNS_PORT, 10);

// See https://tools.ietf.org/html/rfc1034#section-4.3.3
const wildcardRegex = new RegExp('^[*][.](?<anydomain>[^*]+)$');

const respond = (dnsRequest, dnsResponseSend) => {

    console.log(JSON.stringify(dnsRequest));

    const names = [];
    for (let i = 0; i < dnsRequest.questions.length; i++) {
        const name = dnsRequest.questions[i].name;
        names.push(name);
    }

    request.get(`${kc.getCurrentCluster().server}/apis/extensions/v1/ingresses`, opts, (error, response, jsonBody) => {

        const confirmedNames = [];
        console.debug('Checking jsonBody:' + JSON.stringify(jsonBody));
        const body = JSON.parse(jsonBody);
        for (let i = 0; i < body.items.length; i++) {
            const ingress = body.items[i];
            const rules = ingress.spec.rules;
            for (let k = 0; k < rules.length; k++) {
                const rule = rules[k];
                const host = rule.host;
                if (typeof host === "undefined") {
                    continue;
                }
                if (names.includes(host)) {
                    confirmedNames.push(host);
                } else {
                    const match = host.match(wildcardRegex);
                    if (match) {
                        const hostRegex = new RegExp(`[^*]+[.]${_.escapeRegExp(match.groups.anydomain)}`);
                        for (const name of names) {
                            if (name.match(hostRegex)) {
                                confirmedNames.push(name);
                            }
                        }
                    }
                }
            }
        }

        console.log('Confirmed names:' + JSON.stringify(confirmedNames));

        const dnsResponse = new Packet(dnsRequest);
        dnsResponse.header.qr = 1;
        dnsResponse.header.ra = 1;
        dnsResponse.additionals = [];

        for (let i = 0; i < confirmedNames.length; i++) {
            dnsResponse.answers.push({
                address: process.env.POD_IP,
                type: Packet.TYPE.A,
                class: Packet.CLASS.IN,
                ttl: 300,
                name: confirmedNames[i]
            });
        }

        console.log(dnsResponse);

        dnsResponseSend(dnsResponse);
    });
};
const server = dns2.createServer({
    udp: true,
    handle: (request, send, rinfo) => {
        const response = Packet.createResponseFromRequest(request);
        const [ question ] = request.questions;
        const { name } = question;
        response.answers.push({
            name,
            type: Packet.TYPE.A,
            class: Packet.CLASS.IN,
            ttl: 300,
            address: process.env.POD_IP
        });
        send(response);
    }
});

server.on('request', (request, response, rinfo) => {
    console.log(request.header.id, request.questions[0]);
});

server.on('requestError', (error) => {
    console.log('Client sent an invalid request', error);
});

server.on('listening', () => {
    console.log(server.addresses());
});

server.on('close', () => {
    console.log('server closed');
});

server.listen({
    // Optionally specify port, address and/or the family of socket() for udp server:
    udp: {
        port: dnsPort,
        address: process.env.POD_IP,
        type: "udp4",  // IPv4 or IPv6 (Must be either "udp4" or "udp6")
    },
});
// createServer(respond).socket.bind(dnsPort, process.env.POD_IP, () => {
//     console.log(`Listening to ${process.env.POD_IP} on port ${dnsPort}`);
// });