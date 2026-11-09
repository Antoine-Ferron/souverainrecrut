FROM node:22-bookworm-slim AS node
FROM docker:29-dind AS dockercli
FROM aquasec/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb AS trivy

FROM jenkins/jenkins:lts-jdk21
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=dockercli /usr/local/libexec/docker/cli-plugins/docker-buildx /usr/local/libexec/docker/cli-plugins/docker-buildx
COPY --from=trivy /usr/local/bin/trivy /usr/local/bin/trivy
USER root
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && curl -fsSLo /tmp/sonar-scanner.zip https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-8.1.0.6389.zip \
    && echo "ab76ab3c360025e9108be5b55be066f304a164f8b2850d2f2f333915db51bc1b  /tmp/sonar-scanner.zip" | sha256sum -c - \
    && unzip -q /tmp/sonar-scanner.zip -d /opt \
    && mv /opt/sonar-scanner-8.1.0.6389 /opt/sonar-scanner \
    && rm /tmp/sonar-scanner.zip
USER jenkins
ENV PATH="/opt/sonar-scanner/bin:${PATH}"
RUN jenkins-plugin-cli --plugins workflow-aggregator git junit sonar configuration-as-code job-dsl
COPY jenkins.yaml /usr/share/jenkins/ref/casc.yaml
