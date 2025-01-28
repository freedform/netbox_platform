ARG FROM_IMAGE=nextbox
ARG FROM_TAG=v4.1-3.0.4
ARG FROM=${FROM_IMAGE}:${FROM_TAG}
FROM ${FROM}

ENV VIRTUAL_ENV=/opt/netbox/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
COPY ./alerts_plugin /source/alerts-plugin/alerts_plugin
COPY ./setup.py /source/alerts-plugin/
COPY ./MANIFEST.in /source/alerts-plugin/
COPY ./README.md /source/alerts-plugin/
RUN cd /source/alerts-plugin \
    && pip install .
