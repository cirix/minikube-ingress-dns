const dns     = require('dns2');
const k8s     = require('@kubernetes/client-node');
const request = require('request');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const opts = {};
kc.applyToRequest(opts);

dns.createServer(function(dnsRequest, send){

    console.log(dnsRequest);

    const names = [];
    for (let i = 0; i < dnsRequest.questions.length; i++) {
        const name = dnsRequest.questions[i].name;
        names.push(name);
    }

    request.get(`${kc.getCurrentCluster().server}/apis/extensions/v1beta1/ingresses`, opts, (error, response, jsonBody) => {

        console.log(jsonBody);
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

        if(confirmedNames.length > 0){
            const dnsResponse = new dns.Packet(dnsRequest);
            dnsResponse.header.qr = 1;
            dnsResponse.header.ra = 1;

            for(let i = 0; i < confirmedNames.length; i++){
                dnsResponse.answers.push({
                 address: process.env.MINIKUBE_IP,
                 type   : dns.Packet.TYPE.A,
                 class  : dns.Packet.CLASS.IN,
                 ttl: 300,
                 name: confirmedNames[i]
                });
            }

            send(dnsResponse);
        }
    });

}).listen(53);