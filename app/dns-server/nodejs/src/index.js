// noinspection NpmUsedModulesInstalled
const request      = require('request');
const createServer = require('dns2').createServer;
const Packet       = require('dns2').Packet;
const k8s          = require('@kubernetes/client-node');
const _            = require('lodash');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const opts = {};
kc.applyToRequest(opts);

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

    request.get(`${kc.getCurrentCluster().server}/apis/extensions/v1beta1/ingresses`, opts, (error, response, jsonBody) => {

        const confirmedNames = [];

        const body = JSON.parse(jsonBody);
        for (let i = 0; i < body.items.length; i++) {
            const ingress = body.items[i];
            const rules   = ingress.spec.rules;
            for (let k = 0; k < rules.length; k++) {
                const rule = rules[k];
                const host = rule.host;
                if (typeof host === "undefined") {
                    continue;
                }
                if (names.includes(host)) {
                    confirmedNames.push(host);
                }
                else {
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

        const dnsResponse     = new Packet(dnsRequest);
        dnsResponse.header.qr = 1;
        dnsResponse.header.ra = 1;
        dnsResponse.additionals = [];

        for (let i = 0; i < confirmedNames.length; i++) {
            dnsResponse.answers.push({
                address: process.env.POD_IP,
                type   : Packet.TYPE.A,
                class  : Packet.CLASS.IN,
                ttl    : 300,
                name   : confirmedNames[i]
            });
        }

        console.log(dnsResponse);

        dnsResponseSend(dnsResponse);
    });
};

createServer(respond).socket.bind(dnsPort, process.env.POD_IP, () => {
    console.log(`Listening to ${process.env.POD_IP} on port ${dnsPort}`);
});