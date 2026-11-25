"""Static consistency check for signaling.yaml (no cluster needed).
Verifies cross-references that a typo would silently break: selectors vs labels, Service/HPA/Ingress targets,
ports, probe paths against the server's routes. It is NOT a schema validation (use kubeconform / kubectl --dry-run=server).
Run: python deploy/k8s/check.py
"""
import re
import sys
import yaml

docs = [d for d in yaml.safe_load_all(open("deploy/k8s/signaling.yaml", encoding="utf-8")) if d]
by = {d["kind"]: d for d in docs}
errs = []

def need(cond, msg):
    if not cond:
        errs.append(msg)

dep, svc, hpa, ing = by["Deployment"], by["Service"], by["HorizontalPodAutoscaler"], by["Ingress"]
labels = dep["spec"]["template"]["metadata"]["labels"]
need(dep["spec"]["selector"]["matchLabels"].items() <= labels.items(), "Deployment selector does not match pod labels")
need(svc["spec"]["selector"].items() <= labels.items(), "Service selector does not match pod labels")
c = dep["spec"]["template"]["spec"]["containers"][0]
port = c["ports"][0]["containerPort"]
need(svc["spec"]["ports"][0]["targetPort"] == port, "Service targetPort != containerPort")
need(hpa["spec"]["scaleTargetRef"]["name"] == dep["metadata"]["name"], "HPA targets a different Deployment")
need(hpa["spec"]["minReplicas"] <= dep["spec"]["replicas"] <= hpa["spec"]["maxReplicas"], "replicas outside HPA range")
backend = ing["spec"]["rules"][0]["http"]["paths"][0]["backend"]["service"]
need(backend["name"] == svc["metadata"]["name"], "Ingress backend service name mismatch")
need(backend["port"]["number"] == svc["spec"]["ports"][0]["port"], "Ingress backend port mismatch")
need(ing["metadata"]["annotations"].get("nginx.ingress.kubernetes.io/upstream-hash-by") == "$arg_room", "Ingress must hash on $arg_room (room affinity)")
src = open("server/src/index.js", encoding="utf-8").read()
for probe in ("readinessProbe", "livenessProbe"):
    path = c[probe]["httpGet"]["path"]
    need(re.search(r"app\.get\('%s'" % re.escape(path), src) is not None, f"{probe} path {path} is not a server route")
    need(c[probe]["httpGet"]["port"] == port, f"{probe} port mismatch")
env = {e["name"]: e for e in c["env"]}
need(env.get("TRUST_PROXY", {}).get("value") == "true", "TRUST_PROXY must be true behind the ingress")
need("REDIS_URL" in env, "REDIS_URL missing (cross-node relay)")
need(any("memory" in c["resources"].get("limits", {}) for _ in [0]), "no memory limit")

print("\n".join("FAIL: " + e for e in errs) if errs else "OK: manifest cross-references are consistent (static check only)")
sys.exit(1 if errs else 0)
