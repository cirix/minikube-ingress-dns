// noinspection NpmUsedModulesInstalled
const request      = require('request');
const createServer = require('dns2').createServer;
const Packet       = require('dns2').Packet;
const {Resolver}   = require('dns').promises;
const k8s          = require('@kubernetes/client-node');

const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4']);

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const opts = {};
kc.applyToRequest(opts);

const dnsPort = parseInt(process.env.DNS_PORT, 10);
let minikubeIP;

createServer((dnsRequest, dnsResponseSend) => {

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
                if (names.includes(host)) {
                    confirmedNames.push(host);
                }
            }
        }

        console.log('Confirmed names:' + JSON.stringify(confirmedNames));

        if (confirmedNames.length > 0) {
            const dnsResponse     = new Packet(dnsRequest);
            dnsResponse.header.qr = 1;
            dnsResponse.header.ra = 1;

            for (let i = 0; i < confirmedNames.length; i++) {
                dnsResponse.answers.push({
                                             address: minikubeIP,
                                             type   : Packet.TYPE.A,
                                             class  : Packet.CLASS.IN,
                                             ttl    : 300,
                                             name   : confirmedNames[i]
                                         });

                console.log(dnsResponse);
            }

            dnsResponseSend(dnsResponse);
        } else {

            const promises = [];
            for (let i = 0; i < names.length; i++) {
                promises.push(new Promise((resolve, reject) => {
                    const name = names[i];
                    resolver.resolve(names[i]).then((result) => {
                        return resolve({name, result});
                    }).catch(reject);
                }))
            }
            Promise.all(promises).then(list => {
                const dnsResponse     = new Packet(dnsRequest);

                for (const item of list) {
                    dnsResponse.header.qr = 1;
                    dnsResponse.header.ra = 1;
                    for (const result of item.result) {
                        dnsResponse.answers.push({
                                                     address: result,
                                                     type   : Packet.TYPE.A,
                                                     class  : Packet.CLASS.IN,
                                                     ttl    : 300,
                                                     name   : item.name
                                                 });
                    }
                }

                dnsResponseSend(dnsResponse);
            })
        }
    });

}).socket.bind(dnsPort, '0.0.0.0', ()=> {
    console.log(`Listening on port ${dnsPort}`);
});

const getMinikubeIP = async () => {
    return new Promise((resolve, reject) => {
        request.get(`${kc.getCurrentCluster().server}/api`, opts, (error, response, jsonBody) => {
            if (error) {
                return reject(error);
            }
            const body = JSON.parse(jsonBody);
            if(body.serverAddressByClientCIDRs.length > 0){
                const address = body.serverAddressByClientCIDRs[0].serverAddress;
                const parts = address.split(':');
                const ip = parts[0];
                console.log(`Got minikube ip: ${ip}`);
                resolve(ip)
            }else{
                reject('No cluster ip found')
            }
        });
    });
};

const init = async () => {
    const promises = [];
    promises.push(getMinikubeIP().then((ip) => {
        minikubeIP = ip;
        return Promise.resolve();
    }));
    return Promise.all(promises);
};

init().then(() => {
    console.log("Minikube ingress DNS service initialized");
}).catch(() => {
    console.error("Minikube ingress DNS service initialization failed");
    process.exit(1);
});