### Default image is base. You can add other support by modifying BASE_IMAGE_TAG. The following parameters are supported: base (default), ffmpeg, aio
ARG BASE_IMAGE_TAG=base

FROM alpine:edge AS builder
LABEL stage=go-builder
WORKDIR /app/
RUN apk add --no-cache bash curl jq gcc git go musl-dev nodejs npm upx
COPY go.mod go.sum ./
RUN go mod download
COPY ./ ./
RUN bash build.sh release docker

FROM alpine:3.20
LABEL MAINTAINER="OpenList"
ARG USER=openlist
ARG UID=1001
ARG GID=1001

WORKDIR /opt/openlist/

RUN addgroup -g ${GID} ${USER} && \
    adduser -D -u ${UID} -G ${USER} ${USER} && \
    mkdir -p /opt/openlist/data

COPY --from=builder /app/bin/openlist ./
COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /opt/openlist/openlist /entrypoint.sh && chown ${UID}:${GID} /opt/openlist/openlist /entrypoint.sh

USER ${USER}
RUN /entrypoint.sh version

ENV UMASK=022
VOLUME /opt/openlist/data/
EXPOSE 5244 5245
CMD [ "/entrypoint.sh" ]
