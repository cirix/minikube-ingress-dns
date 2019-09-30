# Minikube ingress DNS

## TODO
- If [this proposal](https://github.com/kubernetes/minikube/issues/5494 ) is not accepted write a resolver service that will update dns resolver files each time a minikube instance is added / removed and each time ingress resources in an instance are added, removed or updated. 