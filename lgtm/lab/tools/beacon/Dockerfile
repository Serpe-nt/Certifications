# The check-token beacon: a static Go binary on a distroless base, running as
# a non-root user. Build from lgtm/lab/tools/beacon:
#   docker build --build-arg VERSION=$(cat VERSION) -t ghcr.io/serpe-nt/lgtm-beacon:$(cat VERSION) .
# Base images and why: lgtm/docs/adr/d2-beacon-language.md.
FROM golang:1.27.3-trixie@sha256:af1bfc2614ebb1dbd31af514b78740fd678850e76498762b425ecee4c5c6ea80 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /beacon .

FROM gcr.io/distroless/static-debian13:nonroot@sha256:25ac8f0c3b2334a9eb05452266bd4697864a8c8ef0ef71e5e6480d7f92868329
COPY --from=build /beacon /beacon
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/beacon"]
