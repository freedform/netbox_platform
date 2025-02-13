ARG FROM_IMAGE=nextbox
ARG FROM_TAG=v4.1-3.0.4
ARG FROM=${FROM_IMAGE}:${FROM_TAG}
FROM ${FROM}

ENV VIRTUAL_ENV=/opt/netbox/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
COPY ./endpoints_plugin /source/endpoints-plugin/endpoints_plugin
COPY ./setup.py /source/endpoints-plugin/
COPY ./README.md /source/endpoints-plugin/
RUN cd /source/endpoints-plugin \
    && pip install .
